"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { computeStayPricing, SERVICE_RATE } from "@/lib/pricing";

type Guests = { adults: number; children: number; infants: number };

type BookingConfig = {
  price: number;
  cleaningFee: number | null;
  minNights: number;
  maxNights: number;
  maxGuests: number;
};

type BookingState = BookingConfig & {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: Guests;
  nights: number;
  /** platform service fee (display only — no checkout) */
  serviceFee: number;
  subtotal: number;
  total: number;
  guestCount: number;
  setDate: (d: Date) => void; // range-picker semantics
  clearDates: () => void;
  clearCheckOut: () => void;
  setGuests: (g: Guests) => void;
};

const Ctx = createContext<BookingState | null>(null);

export function BookingProvider({
  config,
  initial,
  children,
}: {
  config: BookingConfig;
  /** pre-fill from the searched dates/guests (still editable in the card) */
  initial?: {
    checkIn?: Date | null;
    checkOut?: Date | null;
    guests?: Partial<Guests>;
  };
  children: ReactNode;
}) {
  const [checkIn, setCheckIn] = useState<Date | null>(initial?.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<Date | null>(initial?.checkOut ?? null);
  const [guests, setGuests] = useState<Guests>({
    adults: Math.max(1, initial?.guests?.adults ?? 1),
    children: initial?.guests?.children ?? 0,
    infants: initial?.guests?.infants ?? 0,
  });

  function setDate(d: Date) {
    if (!checkIn || (checkIn && checkOut) || d <= checkIn) {
      setCheckIn(d);
      setCheckOut(null);
    } else {
      setCheckOut(d);
    }
  }

  const value = useMemo<BookingState>(() => {
    const { nights, roomTotal: subtotal } = computeStayPricing(
      config.price,
      checkIn,
      checkOut,
    );
    const serviceFee = Math.round(subtotal * SERVICE_RATE);
    const cleaning = nights > 0 ? (config.cleaningFee ?? 0) : 0;
    const total = subtotal + serviceFee + cleaning;
    return {
      ...config,
      checkIn,
      checkOut,
      guests,
      nights,
      subtotal,
      serviceFee,
      total,
      guestCount: guests.adults + guests.children,
      setDate,
      clearDates: () => {
        setCheckIn(null);
        setCheckOut(null);
      },
      clearCheckOut: () => setCheckOut(null),
      setGuests,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, guests, config]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking(): BookingState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
