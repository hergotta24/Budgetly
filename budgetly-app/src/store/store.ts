import { configureStore } from "@reduxjs/toolkit";
import flowReducer from "./flowSlice";

export const store = configureStore({
  reducer: {
    flow: flowReducer,
  },
});

// Types for TS
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;