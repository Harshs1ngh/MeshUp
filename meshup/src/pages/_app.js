// 📁 src/pages/_app.js
import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import Head from "next/head";
import store from "../store";
import { rehydrateAuth } from "../store/slices/authSlice";
import { fetchMyProfile } from "../store/slices/profileSlice";
import "../styles/globals.css";

function AppWithAuth({ Component, pageProps }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      const result = await dispatch(rehydrateAuth());

      // ✅ Only fetch profile if a valid session was found
      // This ensures profile data always matches the current logged-in user
      if (rehydrateAuth.fulfilled.match(result) && result.payload) {
        dispatch(fetchMyProfile());
      }
    };
    init();
  }, []); // runs once on every page load/refresh

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0d0d14" />
      </Head>
      <AppWithAuth Component={Component} pageProps={pageProps} />
    </Provider>
  );
}