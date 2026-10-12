"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Product, CreateProductInput } from "../types";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductInput) => Promise<any>;
  initialData?: Product | null;
}

export function ProductModal({ isOpen, onClose, onSubmit, initialData }: ProductModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [category, setCategory] = useState("Electronics");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setPrice(initialData.price);
      setStock(initialData.stock);
      setCategory(initialData.category || "Electronics");
    } else {
      setName("");
      setDescription("");
      setPrice(0);
      setStock(10);
      setCategory("Electronics");
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name, description, price: Number(price), stock: Number(stock), category });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Produk" : "Tambah Produk Baru"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Nama Produk</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            placeholder="Contoh: Mechanical Keyboard"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Kategori</label>
          <input
            type="text"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            placeholder="Electronics, Apparel, Accessories..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Harga (IDR)</label>
            <input
              type="number"
              required
              min={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Stok Unit</label>
            <input
              type="number"
              required
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Deskripsi</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="Deskripsi spesifikasi produk..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Buat Produk"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
