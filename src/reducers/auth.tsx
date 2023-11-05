import { AnyAction } from "redux";

const initialState = {};

const authReducer = (state = initialState, action: AnyAction) => {
  switch (action.type) {
    default:
      return state;
  }
};

export default authReducer;
