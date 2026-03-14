// 📁 src/pages/_app.js
import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import store from "../store";
import { rehydrateAuth } from "../store/slices/authSlice";
import "../styles/globals.css";

function AppWithAuth({ Component, pageProps }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // On every page load, hit /me with the cookie to restore session
    dispatch(rehydrateAuth());
  }, []);

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <AppWithAuth Component={Component} pageProps={pageProps} />
    </Provider>
  );
}