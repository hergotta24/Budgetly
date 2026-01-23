import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type FlowState = {
  processedData: any | null;
};

const initialState: FlowState = {
  processedData: null,
};

const flowSlice = createSlice({
  name: "flow",
  initialState,
  reducers: {
    setProcessedData: (state, action: PayloadAction<any>) => {
      state.processedData = action.payload;
    },
    clearProcessedData: (state) => {
      state.processedData = null;
    },
  },
});

export const { setProcessedData, clearProcessedData } = flowSlice.actions;
export default flowSlice.reducer;
