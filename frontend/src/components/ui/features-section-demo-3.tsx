"use client";
import React from "react";
import { cn } from "@/lib/utils";
import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { IconBrandYoutubeFilled } from "@tabler/icons-react";

export default function FeaturesSectionDemo() {
  const features = [
    {
      title: "Ambient Voice Scribe",
      description:
        "Automatically transcribe and structure clinical conversations directly into the EMR with zero clicks.",
      skeleton: <SkeletonOne />,
      className:
        "col-span-1 lg:col-span-4 border-b lg:border-r border-border/50",
    },
    {
      title: "Advanced Patient Dashboards",
      description:
        "Beautiful, intuitive interfaces that synthesize patient history, conditions, and vitals at a glance.",
      skeleton: <SkeletonTwo />,
      className: "border-b col-span-1 lg:col-span-2 border-border/50",
    },
    {
      title: "Integrated Telehealth",
      description:
        "Conduct secure video consultations fused with real-time AI captioning and emotion analysis.",
      skeleton: <SkeletonThree />,
      className:
        "col-span-1 lg:col-span-3 lg:border-r border-border/50",
    },
    {
      title: "Global Reach & Speed",
      description:
        "Our decentralized network ensures sub-second latency for clinicians anywhere on the globe. We power care without borders.",
      skeleton: <SkeletonFour />,
      className: "col-span-1 lg:col-span-3 border-b lg:border-none",
    },
  ];
  return (
    <div id="features" className="relative z-20 mx-auto w-full max-w-7xl py-10 lg:py-20 lg:pt-0">
      <div className="px-8">
        <h4 className="mx-auto max-w-5xl text-center text-3xl font-bold tracking-tight text-foreground lg:text-5xl lg:leading-tight">
          Next-Generation Clinical Tooling
        </h4>

        <p className="mx-auto my-4 max-w-2xl text-center text-sm font-normal text-muted-foreground lg:text-base">
          From voice-activated charting to integrated video appointments, Smart EMR provides the smartest workflows designed beautifully for modern care teams.
        </p>
      </div>

      <div className="relative">
        <div className="mt-12 grid grid-cols-1 rounded-3xl lg:grid-cols-6 xl:border border-border/50 overflow-hidden bg-background">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className="h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(`relative overflow-hidden p-4 sm:p-8 hover:bg-muted/10 transition-colors duration-300`, className)}>
      {children}
    </div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="max-w-5xl text-left text-xl font-semibold tracking-tight text-foreground md:text-2xl md:leading-snug">
      {children}
    </p>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p
      className={cn(
        "max-w-4xl text-left text-sm md:text-base",
        "font-normal text-muted-foreground",
        "mx-0 my-2 max-w-sm text-left md:text-sm",
      )}
    >
      {children}
    </p>
  );
};

export const SkeletonOne = () => {
  return (
    <div className="relative flex h-full gap-10 px-2 py-6">
      <div className="group mx-auto h-full w-full bg-background p-4 shadow-2xl rounded-2xl border border-border/20">
        <div className="flex h-full w-full flex-1 flex-col space-y-2">
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop"
            alt="Dashboard screenshot"
            width={800}
            height={800}
            className="aspect-square h-full w-full rounded-lg object-cover object-left-top opacity-90 transition-opacity group-hover:opacity-100"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-60 w-full bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-60 w-full bg-gradient-to-b from-background via-transparent to-transparent" />
    </div>
  );
};

export const SkeletonThree = () => {
  return (
    <a
      href="#"
      className="group/image relative flex h-full gap-10 mt-6"
    >
      <div className="group mx-auto h-full w-full bg-transparent rounded-2xl overflow-hidden border border-border/20 shadow-xl">
        <div className="relative flex h-[280px] w-full flex-1 flex-col space-y-2">
          <IconBrandYoutubeFilled className="absolute inset-0 z-10 m-auto h-16 w-16 text-primary shadow-2xl drop-shadow-lg transition-transform group-hover/image:scale-110" />
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2940&auto=format&fit=crop"
            alt="Telehealth consult"
            width={800}
            height={800}
            className="h-full w-full rounded-2xl object-cover object-center blur-[2px] transition-all duration-300 group-hover/image:blur-none opacity-80 group-hover/image:opacity-100"
          />
        </div>
      </div>
    </a>
  );
};

export const SkeletonTwo = () => {
  const images = [
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=2940&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=2940&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=2864&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=2832&auto=format&fit=crop",
  ];

  const imageVariants = {
    whileHover: {
      scale: 1.1,
      rotate: 0,
      zIndex: 100,
    },
    whileTap: {
      scale: 1.1,
      rotate: 0,
      zIndex: 100,
    },
  };
  return (
    <div className="relative flex h-full flex-col items-start gap-10 overflow-hidden p-4 mt-8">
      <div className="-ml-10 flex flex-row">
        {images.map((image, idx) => (
          <motion.div
            variants={imageVariants}
            key={"images-first" + idx}
            style={{
              rotate: Math.random() * 20 - 10,
            }}
            whileHover="whileHover"
            whileTap="whileTap"
            className="mt-4 -mr-6 shrink-0 overflow-hidden rounded-xl border border-border/30 bg-background p-1 shadow-lg"
          >
            <img
              src={image}
              alt="Healthcare image"
              width="500"
              height="500"
              className="h-24 w-24 shrink-0 rounded-lg object-cover md:h-32 md:w-32"
            />
          </motion.div>
        ))}
      </div>
      <div className="flex flex-row">
        {images.map((image, idx) => (
          <motion.div
            key={"images-second" + idx}
            style={{
              rotate: Math.random() * 20 - 10,
            }}
            variants={imageVariants}
            whileHover="whileHover"
            whileTap="whileTap"
            className="mt-4 -mr-6 shrink-0 overflow-hidden rounded-xl border border-border/30 bg-background p-1 shadow-lg"
          >
            <img
              src={image}
              alt="Healthcare image"
              width="500"
              height="500"
              className="h-24 w-24 shrink-0 rounded-lg object-cover md:h-32 md:w-32"
            />
          </motion.div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-50 h-full w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-50 h-full w-20 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
};

export const SkeletonFour = () => {
  return (
    <div className="relative mt-10 flex h-60 flex-col items-center bg-transparent md:h-60">
      <Globe className="absolute -right-10 -bottom-80 md:-right-10 md:-bottom-72" />
    </div>
  );
};

export const Globe = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 4000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 1],
      glowColor: [1, 1, 1],
      markers: [
        // longitude latitude
        { location: [37.7595, -122.4367], size: 0.03 },
        { location: [40.7128, -74.006], size: 0.1 },
      ],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
      className={className}
    />
  );
};
