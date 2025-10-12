interface AppIconProps {
  color?: string;
}

export function AppIcon({ color = 'black' }: AppIconProps) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 227 287"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <g filter="url(#filter0_i_3_12)">
        <path
          d="M100.437 170.216C89.1622 165.916 79.0642 159.011 70.9681 150.063C62.872 141.115 57.0074 130.379 53.8535 118.731C50.6996 107.083 50.3458 94.855 52.8211 83.0446C55.2963 71.2342 60.5303 60.1769 68.0955 50.7758C75.6608 41.3748 85.3426 33.8968 96.3502 28.9526C107.358 24.0084 119.379 21.7383 131.432 22.3278C143.484 22.9173 155.226 26.3496 165.699 32.3444C176.171 38.3392 185.077 46.7263 191.689 56.8208L127.694 98.7365L100.437 170.216Z"
          fill={color}
          fillOpacity="0.88"
        />
      </g>
      <g filter="url(#filter1_i_3_12)">
        <path
          d="M125.994 115.984C137.281 120.289 147.389 127.205 155.489 136.167C163.59 145.129 169.453 155.882 172.598 167.546C175.743 179.209 176.082 191.452 173.585 203.272C171.089 215.092 165.829 226.152 158.236 235.548C150.643 244.943 140.932 252.407 129.9 257.328C118.867 262.25 106.826 264.488 94.7619 263.86C82.6978 263.233 70.9539 259.757 60.4915 253.717C50.0291 247.678 41.1458 239.247 34.5686 229.114L98.7365 187.464L125.994 115.984Z"
          fill={color}
          fillOpacity="0.88"
        />
      </g>
      <defs>
        <filter
          id="filter0_i_3_12"
          x="51.1944"
          y="22.2365"
          width="140.495"
          height="151.979"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3_12" />
        </filter>
        <filter
          id="filter1_i_3_12"
          x="34.5687"
          y="115.984"
          width="140.668"
          height="151.979"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3_12" />
        </filter>
      </defs>
    </svg>
  );
}
