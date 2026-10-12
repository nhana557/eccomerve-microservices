import { expect, test, describe } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
import { Modal } from "./Modal";
import { Badge } from "./Badge";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

describe("Shared UI Design System Components", () => {
  describe("Card Component", () => {
    test("renders Card with default variant and content", () => {
      const html = renderToString(
        <Card variant="default">
          <CardHeader>
            <CardTitle>Kartu Belanja</CardTitle>
            <CardDescription>Deskripsi kartu</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Isi produk</p>
          </CardContent>
          <CardFooter>
            <button>Aksi</button>
          </CardFooter>
        </Card>
      );

      expect(html).toContain("bg-[#14161D]");
      expect(html).toContain("Kartu Belanja");
      expect(html).toContain("Deskripsi kartu");
      expect(html).toContain("Isi produk");
      expect(html).toContain("Aksi");
    });

    test("renders Card with interactive and elevated variants", () => {
      const interactiveHtml = renderToString(
        <Card variant="interactive">Interactive</Card>
      );
      expect(interactiveHtml).toContain("hover:-translate-y-0.5");
      expect(interactiveHtml).toContain("cursor-pointer");

      const elevatedHtml = renderToString(
        <Card variant="elevated">Elevated</Card>
      );
      expect(elevatedHtml).toContain("shadow-xl");
    });
  });

  describe("Modal Component", () => {
    test("renders nothing when isOpen is false", () => {
      const html = renderToString(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Konten</p>
        </Modal>
      );
      expect(html).toBe("");
    });

    test("renders modal overlay and content when isOpen is true", () => {
      const html = renderToString(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Detail Transaksi"
          description="ID: TRX-1234"
          size="lg"
        >
          <p>Konten Modal Terbuka</p>
        </Modal>
      );

      expect(html).toContain("fixed inset-0 z-50");
      expect(html).toContain("Detail Transaksi");
      expect(html).toContain("ID: TRX-1234");
      expect(html).toContain("max-w-lg");
      expect(html).toContain("Konten Modal Terbuka");
    });

    test("renders footer when footer prop is provided", () => {
      const html = renderToString(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Konfirmasi"
          footer={<button id="btn-submit">Kirim</button>}
        >
          <p>Apakah Anda yakin?</p>
        </Modal>
      );

      expect(html).toContain("id=\"btn-submit\"");
      expect(html).toContain("Kirim");
    });
  });

  describe("Badge Component", () => {
    test("renders status badges with appropriate theme colors", () => {
      const successHtml = renderToString(<Badge variant="success">Lunas</Badge>);
      expect(successHtml).toContain("bg-emerald-500/10");
      expect(successHtml).toContain("text-emerald-400");
      expect(successHtml).toContain("Lunas");

      const warningHtml = renderToString(<Badge variant="warning">Menunggu</Badge>);
      expect(warningHtml).toContain("bg-amber-500/10");
      expect(warningHtml).toContain("text-amber-300");

      const dangerHtml = renderToString(<Badge variant="danger">Dibatalkan</Badge>);
      expect(dangerHtml).toContain("bg-rose-500/10");
      expect(dangerHtml).toContain("text-rose-400");

      const infoHtml = renderToString(<Badge variant="info">Dikirim</Badge>);
      expect(infoHtml).toContain("bg-cyan-500/10");
      expect(infoHtml).toContain("text-cyan-300");
    });

    test("renders badge with dot indicator and pulse", () => {
      const dotHtml = renderToString(
        <Badge variant="success" dot pulse>
          Aktif
        </Badge>
      );
      expect(dotHtml).toContain("rounded-full");
      expect(dotHtml).toContain("animate-pulse");
      expect(dotHtml).toContain("bg-emerald-400");
    });
  });

  describe("PageHeader Component", () => {
    test("renders PageHeader with title, description, badge, and actions", () => {
      const html = renderToString(
        <PageHeader
          title="Daftar Pesanan"
          description="Pantau pesanan Anda di sini"
          badge={<Badge variant="success">5 Pesanan</Badge>}
          backHref="/"
          backLabel="Kembali"
          actions={<button id="btn-action">Aksi</button>}
        />
      );

      expect(html).toContain("Daftar Pesanan");
      expect(html).toContain("Pantau pesanan Anda di sini");
      expect(html).toContain("5 Pesanan");
      expect(html).toContain("Kembali");
      expect(html).toContain("btn-action");
    });
  });
});
