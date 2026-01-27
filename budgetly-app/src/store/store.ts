import { configureStore } from "@reduxjs/toolkit";
import flowReducer from "./flowSlice";
import transactionReducer from "./slices/transactionSlice";

export const store = configureStore({
  reducer: {
    flow: flowReducer,
    transactions: transactionReducer,
  },
});

// Types for TS
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;