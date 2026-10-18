"use client";
import { createContext, useContext } from "react";
const Membership = createContext(false);
export const useIllumship = () => useContext(Membership);
export function GameMembership({
  vip,
  children,
}: {
  vip: boolean;
  children: React.ReactNode;
}) {
  return <Membership.Provider value={vip}>{children}</Membership.Provider>;
}
