describe("events handler", () => {
  it("registers app_mention event without throwing", () => {
    const registered = [];
    const fakeApp = {
      event: (name, _handler) => registered.push(name),
    };

    require("../../src/handlers/events")(fakeApp);

    expect(registered).toContain("app_mention");
  });
});
