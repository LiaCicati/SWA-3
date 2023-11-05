import { Dispatch } from "redux";
import { AxiosError } from "axios";
import AuthService from "../services/auth.service";
import {
  CLEAR_CURRENT,
  LOGIN_FAIL,
  LOGIN_SUCCESS,
  LOGOUT,
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
  REGISTER_FAIL,
  REGISTER_SUCCESS,
  SET_MESSAGE,
  SET_USER,
} from "./types";

const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError).isAxiosError === true;
};

const handleErrorResponse = (error: unknown): string => {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: string })?.message;
    return message || error.message || "An error occurred during the request.";
  } else if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred.";
};

const dispatchError = (dispatch: Dispatch, error: unknown) => {
  const message = handleErrorResponse(error);
  dispatch({
    type: SET_MESSAGE,
    payload: {
      message,
      type: MESSAGE_ERROR,
    },
  });
};

const dispatchSuccess = (dispatch: Dispatch, message: string) => {
  dispatch({
    type: SET_MESSAGE,
    payload: {
      message,
      type: MESSAGE_SUCCESS,
    },
  });
};

export const register =
  (username: string, password: string) => async (dispatch: Dispatch) => {
    try {
      await AuthService.register(username, password);
      dispatch({ type: REGISTER_SUCCESS });
      dispatchSuccess(dispatch, "Account created successfully");
    } catch (error) {
      dispatch({ type: REGISTER_FAIL });
      dispatchError(dispatch, error);
    }
  };

export const login =
  (username: string, password: string) => async (dispatch: Dispatch) => {
    try {
      const data = await AuthService.login(username, password);
      dispatch({
        type: LOGIN_SUCCESS,
        payload: { user: data },
      });
    } catch (error) {
      dispatch({ type: LOGIN_FAIL });
      if (isAxiosError(error) && error.response?.status === 403) {
        dispatchError(dispatch, new Error("Invalid login or password"));
      } else {
        dispatchError(dispatch, error);
      }
    }
  };

export const loadUserData = (userId: number) => async (dispatch: Dispatch) => {
  try {
    const response = await AuthService.getUser(userId);
    dispatch({
      type: SET_USER,
      payload: response,
    });
  } catch (error) {
    dispatchError(dispatch, error);
  }
};

export const updateUserProfile =
  (accountId: number, body: object) => async (dispatch: Dispatch) => {
    try {
      await AuthService.updateUser(accountId, body);
      dispatchSuccess(dispatch, "Account updated successfully");
    } catch (error) {
      dispatchError(dispatch, error);
    }
  };

export const logout = () => (dispatch: Dispatch) => {
  AuthService.logout();
  dispatch({ type: CLEAR_CURRENT });
  dispatch({ type: LOGOUT });
};
