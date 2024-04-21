const { spawn } = require("child_process");
const process = require("process");
const fs = require("fs");

function cmd(...command) {
    let p = spawn(command[0], command.slice(1));
    return new Promise((resolve) => {
        p.stdout.on("data", (x) => {
            process.stdout.write(x.toString());
        });
        p.stderr.on("data", (x) => {
            process.stderr.write(x.toString());
        });
        p.on("exit", (code) => {
            resolve(code);
        });
    });
}

afterEach(() => {
    fs.unlinkSync("temp.hlc");
    fs.unlinkSync("temp.ymc");
    fs.unlinkSync("temp.bymc");
    fs.unlinkSync("temp.csv");
});

test("print number", async () => {
    fs.writeFileSync("temp.hlc", "print 1");

    await cmd("node", "app.js", "temp.hlc");
    const ymc = fs.readFileSync("temp.ymc", "utf-8");
    const binary = fs.readFileSync("temp.bymc");

    expect(ymc).toContain("MOV eax, 1");
    expect(ymc).toContain("PRINTN");

    expect(Buffer.from(binary)).toEqual(Buffer.from([0xaa, 0, 1, 1, 0x81, 0]));
});

test("print string", async () => {
    fs.writeFileSync("temp.hlc", 'print "a"');

    await cmd("node", "app.js", "temp.hlc");
    const ymc = fs.readFileSync("temp.ymc", "utf-8");
    const binary = fs.readFileSync("temp.bymc");

    expect(ymc).toContain("MOV eax, [print0]");
    expect(ymc).toContain("PRINT");
    expect(ymc).toContain('print0: "a", 1');

    expect(Buffer.from(binary)).toEqual(Buffer.from([0xad, 0, 1, 0xc0, 0x80, 0]));
});

test("declare variable", async () => {
    fs.writeFileSync("temp.hlc", "signed a\na = 10");

    await cmd("node", "app.js", "temp.hlc");
    const ymc = fs.readFileSync("temp.ymc", "utf-8");
    const binary = fs.readFileSync("temp.bymc");

    expect(ymc).toContain("usera: S 0");
    expect(ymc).toContain("MOV eax, 10");
    expect(ymc).toContain("MOV [usera], eax");

    expect(Buffer.from(binary)).toEqual(Buffer.from([0xaa, 0, 1, 0x0a, 0xac, 0, 0xa0, 1]));
});

test("add number to a variable", async () => {
    fs.writeFileSync("temp.hlc", "signed a\na = a + 10");

    await cmd("node", "app.js", "temp.hlc");
    const ymc = fs.readFileSync("temp.ymc", "utf-8");
    const binary = fs.readFileSync("temp.bymc");

    expect(ymc).toContain("usera: S 0");
    expect(ymc).toContain("MOV eax, [usera]");
    expect(ymc).toContain("MOV ebx, 10");
    expect(ymc).toContain("ADD eax, ebx");
    expect(ymc).toContain("MOV [usera], eax");

    expect(Buffer.from(binary)).toEqual(
        Buffer.from([0xad, 0x00, 0x01, 0xa0, 0xaa, 0x00, 0x02, 0x0a, 0xb0, 0x00, 0x01, 0x02, 0xac, 0x00, 0xa0, 0x01])
    );
});

test("add variables", async () => {
    fs.writeFileSync("temp.hlc", "signed a b c\na = a + b + c");

    await cmd("node", "app.js", "temp.hlc");
    const ymc = fs.readFileSync("temp.ymc", "utf-8");
    const binary = fs.readFileSync("temp.bymc");

    expect(ymc).toContain("usera: S 0");
    expect(ymc).toContain("userb: S 0");
    expect(ymc).toContain("userc: S 0");
    expect(ymc).toContain("MOV eax, [usera]");
    expect(ymc).toContain("MOV ebx, [userb]");
    expect(ymc).toContain("MOV ebx, [userc]");
    expect(ymc).toContain("ADD eax, ebx");
    expect(ymc).toContain("ADD eax, ebx");
    expect(ymc).toContain("MOV [usera], eax");

    expect(Buffer.from(binary)).toEqual(
        Buffer.from([
            0xad, 0x00, 0x01, 0xa0, 0xad, 0x00, 0x02, 0xa1, 0xb0, 0x00, 0x01, 0x02, 0xad, 0x00, 0x02, 0xa2, 0xb0, 0x00,
            0x01, 0x02, 0xac, 0x00, 0xa0, 0x01,
        ])
    );
});

test("if statement", async () => {
    fs.writeFileSync("temp.hlc", "signed a\nprint 1\nif a == 0\n    print 2\nprint 3");

    await cmd("node", "app.js", "temp.hlc");
    const ymc = fs.readFileSync("temp.ymc", "utf-8");
    const binary = fs.readFileSync("temp.bymc");

    expect(ymc).toContain("usera: S 0");

    expect(ymc).toContain("MOV eax, [usera]");
    expect(ymc).toContain("MOV ebx, 0");
    expect(ymc).toContain("CMP eax, ebx");
    expect(ymc).toContain("JE userIf0");
    expect(ymc).toContain("userIf0:\n");
    expect(ymc).toContain("jmp userIf0Rest");
    expect(ymc).toContain("MOV eax, 3");

    expect(Buffer.from(binary)).toEqual(
        Buffer.from([
            0xaa, 0x00, 0x01, 0x01, 0x81, 0x00, 0xad, 0x00, 0x01, 0xa0, 0xaa, 0x00, 0x02, 0x00, 0xf0, 0x01, 0x02, 0x00,
            0xd5, 0x1a, 0xaa, 0x00, 0x01, 0x03, 0x81, 0x00, 0xaa, 0x00, 0x01, 0x02, 0x81, 0x00,
        ])
    );
});

test("while statement", async () => {
    fs.writeFileSync("temp.hlc", "signed a\nprint 1\nwhile a == 0\n    print 2\n    a = a + 1\nprint 3");

    await cmd("node", "app.js", "temp.hlc");
    const ymc = fs.readFileSync("temp.ymc", "utf-8");
    const binary = fs.readFileSync("temp.bymc");

    expect(ymc).toContain("usera: S 0");

    expect(ymc).toContain("MOV eax, [usera]");
    expect(ymc).toContain("MOV ebx, 0");
    expect(ymc).toContain("CMP eax, ebx");
    expect(ymc).toContain("userWhile0Start:");
    expect(ymc).toContain("JE userWhile0");
    expect(ymc).toContain("MOV eax, 3");
    expect(ymc).toContain("userWhile0:");
    expect(ymc).toContain("jmp userWhile0Start");

    expect(Buffer.from(binary)).toEqual(
        Buffer.from([
            0xaa, 0x00, 0x01, 0x01, 0x81, 0x00, 0xad, 0x00, 0x01, 0xa0, 0xaa, 0x00, 0x02, 0x00, 0xf0, 0x01, 0x02, 0x00,
            0xd5, 0x1a, 0xaa, 0x00, 0x01, 0x03, 0x81, 0x00, 0xaa, 0x00, 0x01, 0x02, 0x81, 0x00, 0xad, 0x00, 0x01, 0xa0,
            0xaa, 0x00, 0x02, 0x01, 0xb0, 0x00, 0x01, 0x02, 0xac, 0x00, 0xa0, 0x01,
        ])
    );
});
