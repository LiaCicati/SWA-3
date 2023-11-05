const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem("user") as string);

  if (user && user.token) {
    return {
      token: user.token,
    };
  }

  return {};
};

export { getAuthToken };
