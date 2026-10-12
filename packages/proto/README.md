# Packages: Proto

Direktori ini menyimpan definisi schema Protocol Buffers (`.proto`) untuk seluruh komunikasi gRPC antar-service di platform e-commerce ini.

## Struktur Schema
- `auth/v1/auth.proto`: Validasi token dan user details untuk AuthService.
- `product/v1/product.proto`: Detail katalog produk dan pengecekan/pemotongan stok (`CheckAndDeductStock`).
- `order/v1/order.proto`: Pengambilan order dan update status order.
- `payment/v1/payment.proto`: Pemrosesan pembayaran dan transaksi.

## Kompilasi Code Generation (gRPC Go)
Untuk mengompilasi file proto menjadi Go stubs (`gen/go/...`), Anda dapat menggunakan `protoc` dengan plugin `protoc-gen-go` dan `protoc-gen-go-grpc`:

```bash
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       auth/v1/*.proto product/v1/*.proto order/v1/*.proto payment/v1/*.proto
```
Atau menggunakan Buf CLI:
```bash
buf generate
```
