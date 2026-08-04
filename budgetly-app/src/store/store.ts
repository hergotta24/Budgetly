import {
  combineReducers,
  configureStore,
  createAction,
  type Action,
} from "@reduxjs/toolkit";
import budgetsReducer from "./slices/budgetsSlice";
import categoriesReducer from "./slices/categoriesSlice";
import importsReducer from "./slices/importsSlice";
import transactionsReducer from "./slices/transactionsSlice";

const appReducer = combineReducers({
  transactions: transactionsReducer,
  imports: importsReducer,
  categories: categoriesReducer,
  budgets: budgetsReducer,
});

export type RootState = ReturnType<typeof appReducer>;

export const hydrateWorkspace = createAction<RootState>("workspace/hydrate");
export const clearWorkspace = createAction("workspace/clear");

const rootReducer = (state: RootState | undefined, action: Action) => {
  if (hydrateWorkspace.match(action)) return action.payload;
  if (clearWorkspace.match(action)) return appReducer(undefined, action);
  return appReducer(state, action);
};

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
