package repository_test

import (
	"context"
	"testing"

	"ecommerce-platform/packages/shared-go/database"
	"ecommerce-platform/services/product-service/internal/infrastructure/entity"
	"ecommerce-platform/services/product-service/internal/infrastructure/repository"
)

func TestProductRepository_ListWithFilter(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	if err := db.AutoMigrate(&entity.Category{}, &entity.Product{}); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	repo := repository.NewGormProductRepository(db)
	ctx := context.Background()

	catID1 := "cat-laptop"
	catID2 := "cat-audio"

	products := []entity.Product{
		{ID: "p1", Name: "ASUS ROG Laptop", Price: 25000000, Stock: 5, Category: "Komputer", CategoryID: &catID1},
		{ID: "p2", Name: "Lenovo Legion Laptop", Price: 20000000, Stock: 10, Category: "Komputer", CategoryID: &catID1},
		{ID: "p3", Name: "Sony WH-1000XM5 Headphone", Price: 5000000, Stock: 20, Category: "Audio", CategoryID: &catID2},
	}
	for _, p := range products {
		if err := repo.Create(ctx, &p); err != nil {
			t.Fatalf("failed to seed product: %v", err)
		}
	}

	// 1. Filter by CategoryID
	res, total, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		CategoryID: catID1,
		Limit:      10,
	})
	if err != nil {
		t.Fatalf("failed to filter by category id: %v", err)
	}
	if total != 2 || len(res) != 2 {
		t.Errorf("expected 2 laptop products, got %d (total: %d)", len(res), total)
	}

	// 2. Filter by Search Query
	resSearch, totalSearch, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Search: "Sony",
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("failed to filter by search: %v", err)
	}
	if totalSearch != 1 || len(resSearch) != 1 {
		t.Errorf("expected 1 search result, got %d", len(resSearch))
	}
	if resSearch[0].Name != "Sony WH-1000XM5 Headphone" {
		t.Errorf("expected Sony headphone, got %s", resSearch[0].Name)
	}

	// 3. Sorting by Price ASC
	resSorted, _, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Sort:  "price_asc",
		Limit: 10,
	})
	if err != nil {
		t.Fatalf("failed to sort by price asc: %v", err)
	}
	if resSorted[0].Price != 5000000 {
		t.Errorf("expected lowest price first (5000000), got %d", resSorted[0].Price)
	}

	// 4. Hierarchical Parent Category Filtering
	parentID := "parent-komputer"
	if err := db.Create(&entity.Category{ID: parentID, Name: "Komputer", Slug: "komputer", Level: 1}).Error; err != nil {
		t.Fatalf("failed to create parent category: %v", err)
	}
	if err := db.Create(&entity.Category{ID: catID1, Name: "Laptop", Slug: "laptop", ParentID: &parentID, Level: 2}).Error; err != nil {
		t.Fatalf("failed to create sub category: %v", err)
	}

	resParent, totalParent, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		CategoryID: parentID,
		Limit:      10,
	})
	if err != nil {
		t.Fatalf("failed to filter by parent category id: %v", err)
	}
	if totalParent != 2 || len(resParent) != 2 {
		t.Errorf("expected 2 products under parent category, got %d (total: %d)", len(resParent), totalParent)
	}

	// 5. Hierarchical Category Name Filtering
	resCatName, totalCatName, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Category: "Komputer",
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("failed to filter by category name: %v", err)
	}
	if totalCatName != 2 || len(resCatName) != 2 {
		t.Errorf("expected 2 products under category name 'Komputer', got %d (total: %d)", len(resCatName), totalCatName)
	}

	// 6. Filter by Price Range (MinPrice & MaxPrice)
	resPrice, totalPrice, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		MinPrice: 4000000,
		MaxPrice: 10000000,
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("failed to filter by price range: %v", err)
	}
	if totalPrice != 1 || len(resPrice) != 1 || resPrice[0].ID != "p3" {
		t.Errorf("expected 1 product in price range (p3), got %d (total: %d)", len(resPrice), totalPrice)
	}

	// 7. Filter by MinStock (e.g. stock >= 100)
	_ = repo.Create(ctx, &entity.Product{
		ID: "p4", Name: "Mouse Wireless", Price: 150000, Stock: 150, Category: "Aksesoris",
	})
	resStock, totalStock, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		MinStock: 100,
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("failed to filter by min stock: %v", err)
	}
	if totalStock != 1 || len(resStock) != 1 || resStock[0].ID != "p4" {
		t.Errorf("expected 1 product with stock >= 100 (p4), got %d (total: %d)", len(resStock), totalStock)
	}

	// 8. Methods: btree_index, postgres_filter, and cqrs
	resBtree, totalBtree, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Method: "btree_index",
		Limit:  10,
	})
	if err != nil || len(resBtree) == 0 || totalBtree == 0 {
		t.Errorf("expected btree_index to return products, err: %v", err)
	}

	resPg, totalPg, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Method: "postgres_filter",
		Limit:  10,
	})
	if err != nil || len(resPg) == 0 || totalPg == 0 {
		t.Errorf("expected postgres_filter to return products, err: %v", err)
	}

	// First CQRS hit (populates cache)
	resCqrs1, totalCqrs1, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Method: "cqrs",
		Limit:  10,
	})
	if err != nil || len(resCqrs1) == 0 || totalCqrs1 == 0 {
		t.Errorf("expected cqrs first hit to return products, err: %v", err)
	}

	// Second CQRS hit (serves from cache)
	resCqrs2, totalCqrs2, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Method: "cqrs",
		Limit:  10,
	})
	if err != nil || len(resCqrs2) != len(resCqrs1) || totalCqrs2 != totalCqrs1 {
		t.Errorf("expected cqrs cache hit to match, err: %v", err)
	}
}

type mockESClient struct {
	healthy bool
	err     error
	results []entity.Product
	total   int64
}

func (m *mockESClient) Ping(ctx context.Context) error                            { return m.err }
func (m *mockESClient) EnsureIndex(ctx context.Context) error                     { return m.err }
func (m *mockESClient) IndexProduct(ctx context.Context, p *entity.Product) error { return m.err }
func (m *mockESClient) DeleteProduct(ctx context.Context, id string) error        { return m.err }
func (m *mockESClient) BulkIndexProducts(ctx context.Context, products []entity.Product) (int, error) {
	return len(products), m.err
}
func (m *mockESClient) SearchProducts(ctx context.Context, filter repository.SearchFilter) ([]entity.Product, int64, error) {
	if m.err != nil {
		return nil, 0, m.err
	}
	return m.results, m.total, nil
}
func (m *mockESClient) IsHealthy() bool { return m.healthy }

func TestProductRepository_CQRS_Elasticsearch(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	if err := db.AutoMigrate(&entity.Category{}, &entity.Product{}); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	ctx := context.Background()
	esResults := []entity.Product{
		{ID: "es-1", Name: "ES Projected Product", Price: 100000, Stock: 50, Category: "Elektronik"},
	}

	// 1. Healthy ES client: returns ES results
	mockClient := &mockESClient{healthy: true, results: esResults, total: 1}
	repo := repository.NewGormProductRepositoryWithES(db, mockClient)

	res, total, err := repo.ListWithFilter(ctx, repository.ProductFilter{
		Method: "cqrs",
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("expected no error from CQRS ES, got: %v", err)
	}
	if total != 1 || len(res) != 1 || res[0].ID != "es-1" {
		t.Errorf("expected ES projected product, got: %+v (total: %d)", res, total)
	}

	// 2. Unhealthy/Failing ES client: gracefully falls back to Postgres B-Tree
	_ = repo.Create(ctx, &entity.Product{ID: "pg-fallback", Name: "Postgres Fallback Product", Price: 50000, Stock: 10, Category: "Test"})
	failingMock := &mockESClient{healthy: false, err: context.DeadlineExceeded}
	fallbackRepo := repository.NewGormProductRepositoryWithES(db, failingMock)

	fbRes, fbTotal, fbErr := fallbackRepo.ListWithFilter(ctx, repository.ProductFilter{
		Method: "cqrs",
		Limit:  10,
	})
	if fbErr != nil {
		t.Fatalf("expected graceful fallback without error, got: %v", fbErr)
	}
	if fbTotal == 0 || len(fbRes) == 0 {
		t.Errorf("expected fallback products from Postgres, got 0")
	}
}

func TestProductRepository_InvalidateCache(t *testing.T) {
	db, err := database.NewTestDB()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	_ = db.AutoMigrate(&entity.Category{}, &entity.Product{})
	repo := repository.NewGormProductRepository(db)
	repo.InvalidateCache()
}
