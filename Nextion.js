class NextionScreen {
  constructor() {
    this.canvas = this.addCanvas();
    this.serialBuffer = "";
  }

  addCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }

  onSerialReceive(data) {
    this.serialBuffer += data;
    if (this.serialBuffer.includes("\n")) {
      this.processCommand(this.serialBuffer.trim());
      this.serialBuffer = ""; // Clear the buffer after processing
    }
  }

  processCommand(command) {
    const ctx = this.canvas.getContext("2d");
    if (command.startsWith('t0.txt="')) {
      const text = command.split('"')[1];
      ctx.clearRect(0, 0, 320, 240); // Clear the screen before drawing new text
      ctx.fillStyle = "white";
      ctx.font = "30px Arial";
      ctx.fillText(text, 10, 50); // Display text on screen
    }
    // You can add more commands to simulate Nextion's behavior, like drawing shapes, etc.
  }
}

return {
  setup: function (pins) {
    const screen = new NextionScreen();
    pins[0].setSerialReceiveHandler((data) => screen.onSerialReceive(data));
  }
};
