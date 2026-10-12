'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validateAuthForm } from '../api/auth-api';
import { X, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { isClerkEnabled } from '@/lib/clerk-config';
import { SignInButton } from '@clerk/nextjs';

export function AuthModal() {
  const { isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal, login, register } =
    useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const isReg = authModalMode === 'register';
    const validation = validateAuthForm(email, password, isReg, name);
    if (!validation.isValid) {
      setErrorMsg(validation.error);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isReg) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan pada server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (
    demoEmail = 'budi@example.com',
    demoPass = 'password123',
    demoName = 'Budi Santoso',
  ) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
    try {
      setIsSubmitting(true);
      await login(demoEmail, demoPass);
    } catch {
      try {
        await register(demoName, demoEmail, demoPass);
      } catch (regErr: any) {
        setErrorMsg(regErr.message || 'Gagal masuk dengan akun demo');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      size="md"
      padding="none"
      showCloseButton={false}
      className="bg-[#161922] border-[#262C3A]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#232938]">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white tracking-tight">
            T<span className="text-cyan-400">.</span>STORE
          </span>
          <Badge
            variant="info"
            size="sm"
          >
            Sesi Aman
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeAuthModal}
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Tab Toggle */}
      <div className="grid grid-cols-2 p-1.5 mx-6 mt-5 bg-[#0F1117] rounded-xl border border-[#232938]">
        {/* ✅ Conditional variant: primary kalau aktif, ghost kalau tidak */}
        <Button
          variant={authModalMode === 'login' ? 'primary' : 'ghost'}
          onClick={() => {
            openAuthModal('login');
            setErrorMsg(null);
          }}
          className="shadow-none"
        >
          Masuk
        </Button>
        <Button
          variant={authModalMode === 'register' ? 'primary' : 'ghost'}
          onClick={() => {
            openAuthModal('register');
            setErrorMsg(null);
          }}
          className="shadow-none"
        >
          Daftar Akun
        </Button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 space-y-4"
      >
        {errorMsg && (
          <div className="p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl">
            {errorMsg}
          </div>
        )}

        {authModalMode === 'register' && (
          <InputField
            label="Nama Lengkap"
            icon={UserIcon}
            type="text"
            placeholder="Misal: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            autoComplete="name"
          />
        )}

        <InputField
          label="Email"
          icon={Mail}
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          autoComplete="email"
        />

        <InputField
          label="Kata Sandi"
          icon={Lock}
          type="password"
          placeholder="Minimal 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          autoComplete={authModalMode === 'login' ? 'current-password' : 'new-password'}
        />

        {/* ✅ Submit button — isLoading otomatis render spinner + disable */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          className="mt-2"
        >
          {authModalMode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun Baru'}
        </Button>

        {/* Optional Clerk Google SSO Login */}
        {isClerkEnabled() && (
          <div className="pt-1">
            <SignInButton mode="modal">
              <button
                type="button"
                onClick={closeAuthModal}
                className="w-full py-2.5 bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-[0.98] border border-zinc-700/60 rounded-xl text-xs font-medium text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google (Clerk SSO)</span>
              </button>
            </SignInButton>
          </div>
        )}

        {/* Quick Demo Section */}
        <div className="pt-3 border-t border-[#232938]/80 space-y-2">
          <div className="flex items-center gap-1.5 justify-center text-zinc-400 text-xs font-medium">
            <UserIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Masuk Cepat Akun Demo</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                handleQuickDemoLogin('budi@example.com', 'password123', 'Budi Santoso')
              }
              className="p-2.5 bg-zinc-800/90 hover:bg-zinc-700/80 active:scale-[0.98] border border-zinc-700/60 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="text-xs font-semibold text-white group-hover:text-emerald-400 flex items-center justify-between">
                <span>Budi Santoso</span>
                <span className="text-[10px] text-emerald-400/80 font-normal">Customer</span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5">budi@example.com</div>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                handleQuickDemoLogin('admin@tstore.com', 'password123', 'Admin T.STORE')
              }
              className="p-2.5 bg-zinc-800/90 hover:bg-zinc-700/80 active:scale-[0.98] border border-zinc-700/60 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="text-xs font-semibold text-white group-hover:text-cyan-400 flex items-center justify-between">
                <span>Admin T.STORE</span>
                <span className="text-[10px] text-cyan-400/80 font-normal">Admin</span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5">admin@tstore.com</div>
            </button>
          </div>
        </div>
      </form>

      {/* Footer info */}
      <div className="px-6 py-4 bg-[#0F1117]/80 border-t border-[#232938] text-center">
        <p className="text-[11px] text-zinc-500">
          Sesi diamankan dengan HttpOnly Cookie di server T.STORE Dark Edition.
        </p>
      </div>
    </Modal>
  );
}
