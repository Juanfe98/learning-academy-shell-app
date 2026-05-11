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
  tests: `import { Circle, Rectangle, Shape } from "./shapes";

describe("Circle", () => {
  const c = new Circle(5);

  it("area() returns π × r²", () => {
    expect(c.area()).toBeCloseTo(Math.PI * 25, 4);
  });

  it("perimeter() returns 2π × r", () => {
    expect(c.perimeter()).toBeCloseTo(2 * Math.PI * 5, 4);
  });

  it("describe() formats to 2 decimal places", () => {
    expect(c.describe()).toBe("Area: 78.54, Perimeter: 31.42");
  });
});

describe("Rectangle", () => {
  const r = new Rectangle(4, 6);

  it("area() returns width × height", () => {
    expect(r.area()).toBe(24);
  });

  it("perimeter() returns 2 × (width + height)", () => {
    expect(r.perimeter()).toBe(20);
  });

  it("describe() formats to 2 decimal places", () => {
    expect(r.describe()).toBe("Area: 24.00, Perimeter: 20.00");
  });
});

describe("Polymorphism", () => {
  it("Circle instanceof Shape", () => {
    expect(new Circle(3) instanceof Shape).toBe(true);
  });

  it("Rectangle instanceof Shape", () => {
    expect(new Rectangle(2, 5) instanceof Shape).toBe(true);
  });
});
`,
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
