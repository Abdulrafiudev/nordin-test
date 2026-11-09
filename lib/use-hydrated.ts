"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Each streamed boundary hydrates separately, after a shared auth provider may already be ready.
export function useHydrated() { return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot); }
