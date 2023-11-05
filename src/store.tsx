import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./reducers/auth";
import gameReducer from "./reducers/game";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    game: gameReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
