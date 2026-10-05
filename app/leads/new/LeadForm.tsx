"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { attributionToFields } from "@/lib/attribution";
import { captureAttribution, getStoredAttribution } from "@/lib/attributionClient";
import { trackLead } from "@/lib/analytics";
import { SERVICE_DISCLOSURE } from "@/lib/site";
import {
  ITEM_TYPES,
  PICKUP_LOCATIONS,
  CURBSIDE_COPY,
  CARPET_CONDITIONS,
  PREFERRED_WINDOWS,
  requiresAccessDetails,
  requiresFloorDetails,
  requiresPropertyAccess,
  isCarpet,
  itemTypeForNiche,
  type ItemType,
  type PickupLocation,
} from "@/lib/pickup";

export default function LeadForm() {
  const [itemType, setItemType] = useState<ItemType | "">("");
  const [pickupLocation, setPickupLocation] = useState<PickupLocation>("curbside");
  const [itemsOutside, setItemsOutside] = useState("");
  const [floorInfo, setFloorInfo] = useState("");
  const [heavyItems, setHeavyItems] = useState(false);
  const [occupancy, setOccupancy] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [carpetRooms, setCarpetRooms] = useState("");
  const [carpetCondition, setCarpetCondition] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const conversionFiredRef = useRef(false);

  // After mount (client only), prefill the item type from the niche the visitor came
  // from — without overriding a manual choice. Post-hydration setState is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const attr = captureAttribution();
    const fromNiche = itemTypeForNiche(attr.niche);
    if (fromNiche) setItemType((prev) => prev || fromNiche);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    if (!itemType) { setError("Please choose a service."); return; }
    setError("");
    setSubmitting(true);

    const fd = new FormData();
    fd.append("item_type", itemType);
    fd.append("pickup_location", pickupLocation);
    fd.append("items_outside", itemsOutside);
    fd.append("floor_info", floorInfo);
    fd.append("heavy_items", heavyItems ? "yes" : "no");
    fd.append("occupancy", occupancy);
    fd.append("access_info", accessInfo);
    fd.append("carpet_rooms", carpetRooms);
    fd.append("carpet_condition", carpetCondition);
    fd.append("preferred_date", preferredDate);
    fd.append("preferred_window", preferredWindow);
    fd.append("name", name);
    fd.append("email", email);
    fd.append("phone", phone);
    fd.append("address", address);
    fd.append("zip", zip);
    fd.append("details", details);
    photos.forEach((p) => fd.append("photos", p));

    // Attach attribution (niche, city, source_page, referrer, utm_*) — no customer input.
    const attr = getStoredAttribution();
    const attrFields = attributionToFields(attr);
    for (const [k, v] of Object.entries(attrFields)) fd.append(k, v);

    try {
      const res = await fetch("/api/leads", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json().catch(() => ({}))) as { id?: string };

      // Fire the conversion exactly once per successful submission. The success screen
      // replaces the form (no resubmit), and a refresh resets to an empty form without
      // re-firing, so a normal flow can't double-count.
      if (!conversionFiredRef.current) {
        conversionFiredRef.current = true;
        trackLead({
          leadId: data.id ?? `${Date.now()}`,
          service: itemType || undefined,
          niche: attr.niche,
          city: attr.city,
        });
      }
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again — submit your details and we'll follow up.");
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request received</h1>
          <p className="text-gray-600 mb-6">
            We{"'"}ll review your photos and details and send you a quote.
          </p>
          <Link href="/" className="text-green-600 font-medium hover:underline">
            Back to Home
          </Link>
          <p className="mt-8 text-xs text-gray-400">{SERVICE_DISCLOSURE}</p>
        </div>
      </main>
    );
  }

  // Explicit bg + text color so controls stay readable regardless of the OS color
  // scheme (globals.css flips the inherited body color to near-white under
  // prefers-color-scheme: dark, which otherwise left select/input text white on these
  // forced-light fields).
  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1";

  const showAccessDetails = requiresAccessDetails(pickupLocation);
  const showFloor = requiresFloorDetails(pickupLocation);
  const showProperty = requiresPropertyAccess(itemType);
  const showCarpet = isCarpet(itemType);

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">
          ← Back
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Pickup Quote</h1>
        <p className="text-gray-500 mb-2">
          Tell us what needs to go and add a few photos — we{"'"}ll review and send your quote fast.
        </p>
        <p className="text-gray-500 mb-8">
          PCS move-out or rental turnover in the Fort Eisenhower area? We handle cleanouts and
          curbside pickup of furniture, mattresses, boxes, garage items, and other bulk items.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

          {/* Service / item type */}
          <div>
            <label className={labelCls}>What do you need picked up or cleared out? *</label>
            <select
              required
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
              className={inputCls}
            >
              <option value="" disabled>Choose a service…</option>
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Pickup location — curbside recommended default */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Where are the items?</label>
            <div className="space-y-2">
              {PICKUP_LOCATIONS.map((loc) => (
                <label
                  key={loc.value}
                  className={`flex items-center gap-3 border-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 ${
                    pickupLocation === loc.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="pickup_location"
                    value={loc.value}
                    checked={pickupLocation === loc.value}
                    onChange={() => setPickupLocation(loc.value)}
                    className="accent-green-600"
                  />
                  <span
                    className={`text-sm font-medium ${
                      pickupLocation === loc.value ? "text-green-800" : "text-gray-900"
                    }`}
                  >
                    {loc.label}
                  </span>
                  {loc.recommended && (
                    <span className="ml-auto text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">{CURBSIDE_COPY}</p>
          </div>

          {/* Conditional: access details for non-curbside pickups */}
          {showAccessDetails && (
            <div className="space-y-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div>
                <label className={labelCls}>Are the items already outside / staged for pickup?</label>
                <div className="flex gap-2">
                  {[
                    { v: "yes", l: "Yes" },
                    { v: "no", l: "No, still inside" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setItemsOutside(o.v)}
                      className={`px-4 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        itemsOutside === o.v
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {showFloor && (
                <div>
                  <label className={labelCls}>What floor? Any stairs or elevator?</label>
                  <input
                    type="text"
                    value={floorInfo}
                    onChange={(e) => setFloorInfo(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 3rd floor, no elevator, 2 flights of stairs"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={heavyItems}
                  onChange={(e) => setHeavyItems(e.target.checked)}
                  className="accent-green-600"
                />
                Heavy items or disassembly needed (safe, piano, shed, hot tub, etc.)
              </label>
            </div>
          )}

          {/* Conditional: whole-property access for rental cleanout / trash-out */}
          {showProperty && (
            <div className="space-y-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div>
                <label className={labelCls}>Is the property vacant or occupied?</label>
                <div className="flex gap-2">
                  {[
                    { v: "vacant", l: "Vacant" },
                    { v: "occupied", l: "Occupied" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setOccupancy(o.v)}
                      className={`px-4 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        occupancy === o.v
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>How do we get in? (lockbox code, key, or meet on site)</label>
                <input
                  type="text"
                  value={accessInfo}
                  onChange={(e) => setAccessInfo(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Lockbox on front door, code 1234"
                />
              </div>
            </div>
          )}

          {/* Conditional: carpet details */}
          {showCarpet && (
            <div className="space-y-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div>
                <label className={labelCls}>How many rooms of carpet?</label>
                <input
                  type="text"
                  value={carpetRooms}
                  onChange={(e) => setCarpetRooms(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 3 bedrooms + hallway, with stairs"
                />
              </div>
              <div>
                <label className={labelCls}>Carpet condition</label>
                <select
                  value={carpetCondition}
                  onChange={(e) => setCarpetCondition(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choose…</option>
                  {CARPET_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(555) 000-0000" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="jane@example.com" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Pickup Address *</label>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="123 Main St, Grovetown, GA" />
            </div>
            <div>
              <label className={labelCls}>ZIP *</label>
              <input type="text" required inputMode="numeric" value={zip} onChange={(e) => setZip(e.target.value)} className={inputCls} placeholder="30813" />
            </div>
          </div>

          {/* Preferred timing — optional, light */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Preferred date <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preferred window <span className="font-normal text-gray-400">(optional)</span></label>
              <select value={preferredWindow} onChange={(e) => setPreferredWindow(e.target.value)} className={inputCls}>
                <option value="">No preference</option>
                {PREFERRED_WINDOWS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Details */}
          <div>
            <label className={labelCls}>Anything else we should know? <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={inputCls}
              placeholder="e.g. Old couch and a mattress by the garage, plus a few bags of trash"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Photos <span className="font-normal text-gray-400">(up to 6 — the fastest way to an accurate quote)</span>
            </label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <p className="text-sm text-gray-400">Click to upload photos</p>
              <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP — max 6 files</p>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            </div>
            {photos.length > 0 && (
              <ul className="mt-3 space-y-1">
                {photos.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => removePhoto(i)} className="ml-3 text-red-400 hover:text-red-600 shrink-0">✕</button>
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
            {submitting ? "Submitting..." : "Request My Quote"}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 leading-relaxed">{SERVICE_DISCLOSURE}</p>
      </div>
    </main>
  );
}
