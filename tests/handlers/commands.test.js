describe("commands handler", () => {
  it("registers /lms command without throwing", () => {
    const registered = [];
    const fakeApp = {
      command: (name, _handler) => registered.push(name),
    };

    require("../../src/handlers/commands")(fakeApp);

    expect(registered).toContain("/lms");
  });
});
