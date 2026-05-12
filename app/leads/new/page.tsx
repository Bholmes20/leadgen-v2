"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Service = "junk-removal" | "landscaping" | "";

export default function NewLeadPage() {
  const [service, setService] = useState<Service>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).slice(0, 6);
    setPhotos((prev) => [...prev, ...selected].slice(0, 6));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service) { setError("Please select a service."); return; }
    setError("");
    setSubmitting(true);

    const fd = new FormData();
    fd.append("service", service);
    fd.append("name", name);
    fd.append("email", email);
    fd.append("phone", phone);
    fd.append("address", address);
    fd.append("details", details);
    photos.forEach((p) => fd.append("photos", p));

    try {
      const res = await fetch("/api/leads", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again or call us directly.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h1>
          <p className="text-gray-500 mb-6">
            We{"'"}ve got your info and will be in touch shortly to confirm details and pricing.
          </p>
          <Link href="/" className="text-green-600 font-medium hover:underline">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">
          ← Back
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Quote</h1>
        <p className="text-gray-500 mb-8">Fill out the form and we{"'"}ll get back to you fast.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Service *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "junk-removal", label: "🚛 Junk Removal" },
                { value: "landscaping", label: "🌿 Landscaping" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setService(s.value as Service)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${
                    service === s.value
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="(555) 000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Service Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="123 Main St, City, State"
            />
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tell us about the job
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder={
                service === "landscaping"
                  ? "e.g. Weekly lawn mowing, about 1/4 acre lot, some trimming needed..."
                  : "e.g. Full truck load of furniture and appliances from garage..."
              }
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Photos <span className="font-normal text-gray-400">(up to 6, helps us estimate)</span>
            </label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <p className="text-sm text-gray-400">Click to upload photos</p>
              <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP — max 6 files</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
            </div>
            {photos.length > 0 && (
              <ul className="mt-3 space-y-1">
                {photos.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="ml-3 text-red-400 hover:text-red-600 shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </main>
  );
}
