package elasticsearch

import (
	"testing"
)

func TestBuildSearchDSL_Defaults(t *testing.T) {
	filter := SearchFilter{}
	dsl, err := BuildSearchDSL(filter)
	if err != nil {
		t.Fatalf("BuildSearchDSL returned error: %v", err)
	}

	if dsl["size"] != 20 {
		t.Errorf("expected size 20, got %v", dsl["size"])
	}
	if dsl["from"] != 0 {
		t.Errorf("expected from 0, got %v", dsl["from"])
	}
	if dsl["track_total_hits"] != true {
		t.Errorf("expected track_total_hits to be true")
	}

	queryMap, ok := dsl["query"].(map[string]any)
	if !ok {
		t.Fatalf("expected query to be map[string]any")
	}
	if _, ok := queryMap["match_all"]; !ok {
		t.Errorf("expected match_all query when no filters are provided")
	}
}

func TestBuildSearchDSL_ComplexFilters(t *testing.T) {
	filter := SearchFilter{
		Search:     "mechanical keyboard",
		CategoryID: "sub-elec-1",
		Category:   "Elektronik",
		MinPrice:   500000,
		MaxPrice:   2000000,
		MinStock:   10,
		Limit:      50,
		Offset:     100,
		Sort:       "price_asc",
	}

	dsl, err := BuildSearchDSL(filter)
	if err != nil {
		t.Fatalf("BuildSearchDSL returned error: %v", err)
	}

	if dsl["size"] != 50 {
		t.Errorf("expected size 50, got %v", dsl["size"])
	}
	if dsl["from"] != 100 {
		t.Errorf("expected from 100, got %v", dsl["from"])
	}

	queryMap := dsl["query"].(map[string]any)
	boolMap, ok := queryMap["bool"].(map[string]any)
	if !ok {
		t.Fatalf("expected bool query, got %v", queryMap)
	}

	// Must: multi_match search (with typo tolerance and prefix clauses)
	mustList, ok := boolMap["must"].([]any)
	if !ok || len(mustList) == 0 {
		t.Fatalf("expected must clause for text search")
	}
	firstMust := mustList[0].(map[string]any)
	var multiMatch map[string]any
	if mm, ok := firstMust["multi_match"].(map[string]any); ok {
		multiMatch = mm
	} else if subBool, ok := firstMust["bool"].(map[string]any); ok {
		if shouldList, ok := subBool["should"].([]any); ok && len(shouldList) > 0 {
			firstShould := shouldList[0].(map[string]any)
			multiMatch, _ = firstShould["multi_match"].(map[string]any)
		}
	}
	if multiMatch == nil {
		t.Fatalf("expected multi_match clause in search query")
	}
	if multiMatch["query"] != "mechanical keyboard" {
		t.Errorf("expected query 'mechanical keyboard', got %v", multiMatch["query"])
	}

	// Filters: term & range
	filterList, ok := boolMap["filter"].([]any)
	if !ok || len(filterList) < 3 {
		t.Fatalf("expected at least 3 filter clauses (category, price, stock), got %d", len(filterList))
	}

	// Sorts: price asc
	sortList, ok := dsl["sort"].([]any)
	if !ok || len(sortList) == 0 {
		t.Fatalf("expected sort clause")
	}
	firstSort := sortList[0].(map[string]any)
	if firstSort["price"] != "asc" {
		t.Errorf("expected sort price: asc, got %v", firstSort)
	}
}

func TestBuildSearchDSL_TypoCorrectionFuzziness(t *testing.T) {
	filter := SearchFilter{
		Search: "separu",
		Limit:  20,
	}
	dsl, err := BuildSearchDSL(filter)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	queryMap := dsl["query"].(map[string]any)
	boolMap := queryMap["bool"].(map[string]any)
	mustList := boolMap["must"].([]any)
	firstMust := mustList[0].(map[string]any)
	subBool := firstMust["bool"].(map[string]any)
	shouldList := subBool["should"].([]any)

	foundFuzzy := false
	for _, s := range shouldList {
		clause := s.(map[string]any)
		if mm, ok := clause["multi_match"].(map[string]any); ok {
			if mm["fuzziness"] == "AUTO" {
				foundFuzzy = true
				break
			}
		}
	}
	if !foundFuzzy {
		t.Fatalf("expected fuzzy multi_match with fuzziness AUTO for typo tolerance")
	}
}

func TestParseSearchResponse_Success(t *testing.T) {
	mockJSON := `{
		"took": 2,
		"timed_out": false,
		"hits": {
			"total": {
				"value": 150,
				"relation": "eq"
			},
			"hits": [
				{
					"_id": "p-1",
					"_source": {
						"id": "p-1",
						"name": "Wireless Ergonomic Mouse",
						"price": 350000,
						"stock": 25,
						"category": "Elektronik",
						"category_id": "sub-elec-2"
					}
				},
				{
					"_id": "p-2",
					"_source": {
						"id": "p-2",
						"name": "Mechanical Keyboard RGB",
						"price": 1250000,
						"stock": 10,
						"category": "Elektronik",
						"category_id": "sub-elec-1"
					}
				}
			]
		}
	}`

	products, total, err := ParseSearchResponse([]byte(mockJSON))
	if err != nil {
		t.Fatalf("ParseSearchResponse failed: %v", err)
	}
	if total != 150 {
		t.Errorf("expected total 150, got %d", total)
	}
	if len(products) != 2 {
		t.Fatalf("expected 2 products, got %d", len(products))
	}
	if products[0].ID != "p-1" || products[0].Name != "Wireless Ergonomic Mouse" {
		t.Errorf("unexpected product 0: %+v", products[0])
	}
	if products[1].ID != "p-2" || products[1].Price != 1250000 {
		t.Errorf("unexpected product 1: %+v", products[1])
	}
}

func TestParseSearchResponse_EmptyHits(t *testing.T) {
	mockJSON := `{
		"took": 1,
		"hits": {
			"total": { "value": 0 },
			"hits": []
		}
	}`

	products, total, err := ParseSearchResponse([]byte(mockJSON))
	if err != nil {
		t.Fatalf("ParseSearchResponse failed on empty hits: %v", err)
	}
	if total != 0 {
		t.Errorf("expected total 0, got %d", total)
	}
	if len(products) != 0 {
		t.Errorf("expected 0 products, got %d", len(products))
	}
}

func TestParseSearchResponse_Malformed(t *testing.T) {
	_, _, err := ParseSearchResponse([]byte("invalid json"))
	if err == nil {
		t.Fatalf("expected error on malformed json, got nil")
	}
}
