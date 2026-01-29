"use client";

import { CircularProgress } from "@heroui/progress";

export default function Chart() {
  return (
    <section className="section-chart">
      <h2 className="sr-only">
        Spending Overview
      </h2>

      <div>
        <CircularProgress
          classNames={{
            svg: "w-36 h-36",
            
            indicator: "stroke-green-500",
            value: "text-2xl font-semibold text-white",
            label: "text-gray-400",
          }}
          
          showValueLabel={true}
          value={70}
          formatOptions={{ style: "unit", unit: "kilometer" }}
        />
      </div>
    </section>
  );
}
