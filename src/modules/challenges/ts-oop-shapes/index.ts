import type { Challenge } from "@/lib/challenges/types";

const tsOopShapes: Challenge = {
  slug: "ts-oop-shapes",
  title: "OOP Shapes with TypeScript",
  description:
    "Implement a Shape hierarchy using TypeScript abstract classes. Complete the area() and perimeter() methods on Circle and Rectangle so the console output matches the expected values.",
  difficulty: "intermediate",
  tags: ["typescript", "oop", "abstract-classes"],
  environment: "node-ts",
  entryFile: "index.ts",
  files: [
    {
      filename: "shapes.ts",
      language: "ts",
      content: `export abstract class Shape {
  abstract area(): number;
  abstract perimeter(): number;

  describe(): string {
    return \`Area: \${this.area().toFixed(2)}, Perimeter: \${this.perimeter().toFixed(2)}\`;
  }
}

export class Circle extends Shape {
  constructor(private radius: number) {
    super();
  }

  // TODO: implement area() → Math.PI * radius²
  area(): number {
    return 0;
  }

  // TODO: implement perimeter() → 2 * Math.PI * radius
  perimeter(): number {
    return 0;
  }
}

export class Rectangle extends Shape {
  constructor(private width: number, private height: number) {
    super();
  }

  // TODO: implement area() → width * height
  area(): number {
    return 0;
  }

  // TODO: implement perimeter() → 2 * (width + height)
  perimeter(): number {
    return 0;
  }
}
`,
    },
    {
      filename: "index.ts",
      language: "ts",
      content: `import { Circle, Rectangle } from "./shapes";

const circle = new Circle(5);
const rect = new Rectangle(4, 6);

console.log("Circle:", circle.describe());
console.log("Rectangle:", rect.describe());

// Expected output:
// Circle: Area: 78.54, Perimeter: 31.42
// Rectangle: Area: 24.00, Perimeter: 20.00
`,
    },
  ],
};

export default tsOopShapes;
