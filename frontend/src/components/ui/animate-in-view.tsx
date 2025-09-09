"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimateInViewProps {
  children: React.ReactNode;
  className?: string;
  animation?:
    | "fade"
    | "slide-up"
    | "slide-left"
    | "slide-right"
    | "scale"
    | "flip";
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

export function AnimateInView({
  children,
  className,
  animation = "fade",
  delay = 0,
  duration = 600,
  threshold = 0.1,
  once = true,
}: AnimateInViewProps) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    const currentElement = ref.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold, once]);

  const getAnimationClasses = () => {
    const baseClasses = "transition-all ease-out";

    switch (animation) {
      case "slide-up":
        return cn(
          baseClasses,
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        );
      case "slide-left":
        return cn(
          baseClasses,
          isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        );
      case "slide-right":
        return cn(
          baseClasses,
          isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
        );
      case "scale":
        return cn(
          baseClasses,
          isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"
        );
      case "flip":
        return cn(
          baseClasses,
          isInView ? "opacity-100 rotate-0" : "opacity-0 rotate-12"
        );
      default: // fade
        return cn(baseClasses, isInView ? "opacity-100" : "opacity-0");
    }
  };

  return (
    <div
      ref={ref}
      className={cn(getAnimationClasses(), className)}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Staggered animation wrapper for lists
interface StaggeredAnimationProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  animation?: AnimateInViewProps["animation"];
  className?: string;
}

export function StaggeredAnimation({
  children,
  staggerDelay = 100,
  animation = "slide-up",
  className,
}: StaggeredAnimationProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <AnimateInView
          key={index}
          animation={animation}
          delay={index * staggerDelay}
          duration={600}
        >
          {child}
        </AnimateInView>
      ))}
    </div>
  );
}

// Specific animation components for common use cases
export function FadeInView({
  children,
  ...props
}: Omit<AnimateInViewProps, "animation">) {
  return (
    <AnimateInView animation="fade" {...props}>
      {children}
    </AnimateInView>
  );
}

export function SlideUpView({
  children,
  ...props
}: Omit<AnimateInViewProps, "animation">) {
  return (
    <AnimateInView animation="slide-up" {...props}>
      {children}
    </AnimateInView>
  );
}

export function ScaleInView({
  children,
  ...props
}: Omit<AnimateInViewProps, "animation">) {
  return (
    <AnimateInView animation="scale" {...props}>
      {children}
    </AnimateInView>
  );
}
