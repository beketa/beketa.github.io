var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function showStatus(text) {
    const statusSpan = document.getElementById("status");
    statusSpan.innerHTML = text;
}
function run() {
    const runButton = document.getElementById("run");
    runButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
        const session = yield ai.languageModel.create();
        const promptTextArea = document.getElementById("prompt");
        const responseTextArea = document.getElementById("response");
        const prompt = promptTextArea.value;
        responseTextArea.value = '';
        const elapsedTimes = [];
        let tokens = 0;
        for (let i = 0; i < 20; i++) {
            const start = Date.now();
            const result = yield session.prompt(prompt);
            const elapsed = Date.now() - start;
            elapsedTimes.push(elapsed);
            responseTextArea.value = result;
            tokens += result.split(' ').length;
            showStatus(`elapsed: ${elapsed}ms\n`
                + `token/s: ${(result.split(' ').length / elapsed * 1000).toFixed(2)}\n`);
        }
        elapsedTimes.sort((x, y) => x - y);
        let sum = 0;
        for (const e of elapsedTimes) {
            sum += e;
        }
        showStatus(`mean: ${sum / elapsedTimes.length}ms\n`
            + `5%: ${elapsedTimes[1]}ms\n`
            + `95%: ${elapsedTimes[18]}ms\n`
            + `token/s: ${(tokens / sum * 1000).toFixed(2)}\n`);
    }));
}
run();
