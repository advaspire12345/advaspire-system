"use client";

import { useRef, useEffect } from "react";

interface HexagonAvatarProps {
  size?: number;
  imageUrl?: string;
  percentage?: number;
  animated?: boolean;
  fallbackInitials?: string;
  cornerRadius?: number;
}

function getComputedColor(cssVar: string): string {
  if (typeof window === "undefined") return "#000";
  const style = getComputedStyle(document.documentElement);
  const value = style.getPropertyValue(cssVar).trim();
  if (!value) return "#000";
  // Convert oklch to a usable format by creating a temporary element
  const temp = document.createElement("div");
  temp.style.color = value;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);
  return computed;
}

export function HexagonAvatar({
  size = 80,
  imageUrl,
  percentage = 0.85,
  animated = true,
  fallbackInitials = "U",
  cornerRadius = 8,
}: HexagonAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get theme colors
    const primaryColor = getComputedColor("--chart-1");
    const secondaryColor = getComputedColor("--chart-2");
    const backgroundColor = getComputedColor("--background");
    const mutedColor = getComputedColor("--muted");

    canvas.width = size;
    canvas.height = size;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";

    const sides = 6;
    const barWidth = size / 20;
    const outerSpace = (size / 100) * 7.1;
    const bgRadius = size / 2;
    const polyRadius = size / 2 - outerSpace;
    const inset = 0.5;
    const barRadius = polyRadius - barWidth * inset;
    const rotation = -Math.PI * 0.5;
    const approxLineLen = barRadius * Math.PI * 2;

    type Point = { x: number; y: number };

    function point(x: number, y: number): Point {
      return { x, y };
    }

    function polygon(sides: number, radius: number, rot = 0): Point[] {
      const step = (Math.PI * 2) / sides;
      const path: Point[] = [];
      for (let i = 0; i < sides; i++) {
        path.push(
          point(
            Math.cos(i * step + rot) * radius + outerSpace,
            Math.sin(i * step + rot) * radius + outerSpace,
          ),
        );
      }
      return path;
    }

    function roundedPath(path: Point[]) {
      let i = 0;
      let p1 = path[i++];
      let p2 = path[i];
      const len = path.length;
      ctx!.moveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      while (i <= len) {
        p1 = p2;
        p2 = path[++i % len];
        ctx!.arcTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, cornerRadius);
      }
    }

    function fillRoundedPath(
      cx: number,
      cy: number,
      path: Point[],
      style: string,
      renderImage: boolean,
    ) {
      ctx!.setTransform(1, 0, 0, 1, cx, cy);
      ctx!.fillStyle = style;
      ctx!.beginPath();
      roundedPath(path);
      ctx!.fill();
      if (renderImage && img.complete && img.naturalWidth > 0) {
        setImageBackground();
      } else if (!renderImage) {
        return;
      } else {
        // Draw fallback initials
        drawFallbackInitials();
      }
    }

    function drawFallbackInitials() {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.fillStyle = getComputedColor("--muted-foreground");
      ctx!.font = `bold ${size * 0.3}px sans-serif`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText(fallbackInitials, size / 2, size / 2);
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    if (imageUrl) {
      img.src = imageUrl;
    }

    function setImageBackground() {
      const imgWidth = img.width;
      const imgHeight = img.height;
      const percentWidth = size / imgWidth;
      const percentHeight = size / imgHeight;
      const percentImage = Math.max(percentHeight, percentWidth);
      const newWidth = imgWidth * percentImage * 0.75;
      const newHeight = imgHeight * percentImage * 0.75;
      const offsetWidth = -newWidth / 2.5;
      const offsetHeight = -newHeight / 2.5;

      ctx!.save();
      ctx!.clip();
      ctx!.drawImage(
        img,
        0,
        0,
        imgWidth,
        imgHeight,
        offsetWidth,
        offsetHeight,
        newWidth,
        newHeight,
      );
      ctx!.restore();
    }

    const bgPoly = polygon(sides, bgRadius, rotation);
    const hexPoly = polygon(sides, polyRadius, rotation);
    const imageHexRadius = polyRadius - barWidth * 2 * inset;
    const scaledImageHexRadius = imageHexRadius * 0.96;
    const hexPolyInner = polygon(sides, scaledImageHexRadius, rotation);
    const hexBar = polygon(sides, barRadius, rotation);

    let animationFrameId: number;
    let progress = 0;

    function render(progressValue: number) {
      const currentProgress = progressValue;

      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Background hexagon
      fillRoundedPath(polyRadius, polyRadius, bgPoly, backgroundColor, false);

      // Middle hexagon (track)
      fillRoundedPath(polyRadius, polyRadius, hexPoly, mutedColor, false);

      // Inner hexagon with image
      fillRoundedPath(polyRadius, polyRadius, hexPolyInner, mutedColor, true);

      // Border stroke for image hexagon
      ctx!.save();
      ctx!.setTransform(1, 0, 0, 1, polyRadius, polyRadius);
      ctx!.beginPath();
      roundedPath(hexPolyInner);
      ctx!.closePath();
      ctx!.lineWidth = polyRadius * 0.05;
      ctx!.strokeStyle = backgroundColor;
      ctx!.stroke();
      ctx!.restore();

      // Animated gradient progress ring
      ctx!.save();
      ctx!.setLineDash([approxLineLen]);
      ctx!.lineDashOffset = approxLineLen - currentProgress * approxLineLen;
      ctx!.lineWidth = barWidth;
      ctx!.lineCap = "butt";
      const gradient = ctx!.createLinearGradient(-polyRadius, 0, polyRadius, 0);
      gradient.addColorStop(1, primaryColor);
      gradient.addColorStop(0, secondaryColor);
      ctx!.strokeStyle = gradient;
      ctx!.setTransform(1, 0, 0, 1, polyRadius, polyRadius);
      ctx!.beginPath();
      roundedPath(hexBar);
      ctx!.closePath();
      ctx!.stroke();
      ctx!.restore();
    }

    function animate() {
      const current = Math.min(progress, percentage);
      render(current);
      if (progress < percentage) {
        progress += 0.02;
        animationFrameId = window.requestAnimationFrame(animate);
      } else {
        render(percentage);
      }
    }

    function startRender() {
      if (animated) {
        progress = 0;
        animate();
      } else {
        render(percentage);
      }
    }

    img.onload = startRender;

    // Handle no image or cached image
    if (!imageUrl || img.complete) {
      startRender();
    }

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [size, imageUrl, percentage, animated, fallbackInitials, cornerRadius]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}
