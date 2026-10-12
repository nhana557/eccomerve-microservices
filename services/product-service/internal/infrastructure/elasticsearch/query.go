package elasticsearch

import (
	"encoding/json"
	"fmt"
	"strings"

	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
)

// BuildSearchDSL converts a SearchFilter into an Elasticsearch Query DSL JSON structure.
func BuildSearchDSL(filter SearchFilter) (map[string]any, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 10000 {
		limit = 10000
	}

	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	dsl := map[string]any{
		"from":             offset,
		"size":             limit,
		"track_total_hits": true,
	}

	var mustClauses []any
	var filterClauses []any

	// 1. Text Search (BM25 relevancy scoring + Typo Tolerance via Fuzziness AUTO + Live Prefix Matching)
	search := strings.TrimSpace(filter.Search)
	if search != "" {
		mustClauses = append(mustClauses, map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{
						"multi_match": map[string]any{
							"query":  search,
							"fields": []string{"name^10", "description"},
							"type":   "bool_prefix",
							"boost":  5.0,
						},
					},
					map[string]any{
						"multi_match": map[string]any{
							"query":          search,
							"fields":         []string{"name^5", "description"},
							"type":           "best_fields",
							"fuzziness":      "AUTO",
							"prefix_length":  1,
							"max_expansions": 50,
							"boost":          1.0,
						},
					},
				},
				"minimum_should_match": 1,
			},
		})
	}

	// 2. Category Filter (Supports keyword, analyzed phrase, and case-insensitive matching)
	if filter.CategoryID != "" {
		filterClauses = append(filterClauses, map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{"term": map[string]any{"category_id.keyword": map[string]any{"value": filter.CategoryID, "case_insensitive": true}}},
					map[string]any{"term": map[string]any{"category_id": filter.CategoryID}},
					map[string]any{"match_phrase": map[string]any{"category_id": filter.CategoryID}},
				},
				"minimum_should_match": 1,
			},
		})
	} else if filter.Category != "" && filter.Category != "All" && strings.ToLower(filter.Category) != "all" {
		catName := strings.TrimSpace(filter.Category)
		filterClauses = append(filterClauses, map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{"term": map[string]any{"category.keyword": map[string]any{"value": catName, "case_insensitive": true}}},
					map[string]any{"match_phrase": map[string]any{"category": catName}},
				},
				"minimum_should_match": 1,
			},
		})
	}

	// 3. Price Range Filter
	if filter.MinPrice > 0 || filter.MaxPrice > 0 {
		priceRange := map[string]any{}
		if filter.MinPrice > 0 {
			priceRange["gte"] = filter.MinPrice
		}
		if filter.MaxPrice > 0 {
			priceRange["lte"] = filter.MaxPrice
		}
		filterClauses = append(filterClauses, map[string]any{
			"range": map[string]any{
				"price": priceRange,
			},
		})
	}

	// 4. Stock Filter
	if filter.MinStock > 0 {
		filterClauses = append(filterClauses, map[string]any{
			"range": map[string]any{
				"stock": map[string]any{
					"gte": filter.MinStock,
				},
			},
		})
	}

	// 5. Construct Query Block
	if len(mustClauses) > 0 || len(filterClauses) > 0 {
		boolQuery := map[string]any{}
		if len(mustClauses) > 0 {
			boolQuery["must"] = mustClauses
		}
		if len(filterClauses) > 0 {
			boolQuery["filter"] = filterClauses
		}
		dsl["query"] = map[string]any{
			"bool": boolQuery,
		}
	} else {
		dsl["query"] = map[string]any{
			"match_all": map[string]any{},
		}
	}

	// 6. Sorting
	switch filter.Sort {
	case "price_asc":
		dsl["sort"] = []any{map[string]any{"price": "asc"}}
	case "price_desc":
		dsl["sort"] = []any{map[string]any{"price": "desc"}}
	case "name_asc":
		dsl["sort"] = []any{map[string]any{"name.keyword": "asc"}}
	case "name_desc":
		dsl["sort"] = []any{map[string]any{"name.keyword": "desc"}}
	case "stock_asc":
		dsl["sort"] = []any{map[string]any{"stock": "asc"}}
	case "stock_desc":
		dsl["sort"] = []any{map[string]any{"stock": "desc"}}
	case "created_at_asc", "oldest":
		dsl["sort"] = []any{map[string]any{"created_at": "asc"}}
	case "created_at_desc", "newest":
		dsl["sort"] = []any{map[string]any{"created_at": "desc"}}
	default:
		if search != "" {
			dsl["sort"] = []any{
				map[string]any{"_score": "desc"},
				map[string]any{"created_at": "desc"},
			}
		} else {
			dsl["sort"] = []any{map[string]any{"created_at": "desc"}}
		}
	}

	return dsl, nil
}

type esSearchHit struct {
	ID     string         `json:"_id"`
	Source entity.Product `json:"_source"`
}

type esSearchResponse struct {
	Took int `json:"took"`
	Hits struct {
		Total struct {
			Value int64 `json:"value"`
		} `json:"total"`
		Hits []esSearchHit `json:"hits"`
	} `json:"hits"`
}

// ParseSearchResponse decodes raw Elasticsearch JSON into domain product entities and total count.
func ParseSearchResponse(body []byte) ([]entity.Product, int64, error) {
	var resp esSearchResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, 0, fmt.Errorf("failed to unmarshal elasticsearch response: %w", err)
	}

	products := make([]entity.Product, len(resp.Hits.Hits))
	for i, hit := range resp.Hits.Hits {
		products[i] = hit.Source
		if products[i].ID == "" {
			products[i].ID = hit.ID
		}
	}

	return products, resp.Hits.Total.Value, nil
}
