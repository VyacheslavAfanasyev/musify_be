import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthModule } from "../src/auth.module";

describe("AuthController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/ (GET)", () => {
    return expect(true).toBe(true);
  });
});
