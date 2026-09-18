"use client";

import { useState, useRef, useEffect, useCallback } from "react";

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function Page() {
  const [files, setFiles] = useState([]); // { file, url }
  const [screen, setScreen] = useState("upload"); // upload | loading | results | empty
  const [loadingText, setLoadingText] = useState("Reading your photo…");
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [emptyTitle, setEmptyTitle] = useState("No problem found");
  const [emptyMsg, setEmptyMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((list) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setFiles((prev) => [
      ...prev,
      ...arr.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    ]);
    setStatus("");
  }, []);

  const removeFile = (i) => {
    setFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[i].url);
      next.splice(i, 1);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const solveAll = async () => {
    if (files.length === 0) return;
    setScreen("loading");
    const collected = [];
    let anyFailure = false;
    let lastErrorMsg = "";

    for (let i = 0; i < files.length; i++) {
      setLoadingText(
        files.length > 1
          ? `Reading photo ${i + 1} of ${files.length}…`
          : "Reading your photo…"
      );
      try {
        const formData = new FormData();
        formData.append("image", files[i].file);

        const res = await fetch("/api/solve", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          anyFailure = true;
          lastErrorMsg = data.error || "Something went wrong reading that photo — try again.";
          continue;
        }

        const qs = Array.isArray(data.questions) ? data.questions : [];
        qs.forEach((q) => {
          collected.push({
            number: String(q.number != null ? q.number : collected.length + 1),
            problem: String(q.problem || ""),
            solution: String(q.solution || ""),
            answer: String(q.answer || ""),
            sourceIndex: i,
          });
        });
      } catch (e) {
        anyFailure = true;
        lastErrorMsg = "Couldn't reach the solver — check your connection and try again.";
      }
    }

    if (collected.length === 0) {
      setEmptyTitle(anyFailure ? "Couldn't solve that" : "No problem found");
      setEmptyMsg(
        anyFailure
          ? lastErrorMsg
          : "Try a clearer photo, with the problem fully in frame and readable."
      );
      setScreen("empty");
      return;
    }

    setPages(collected);
    setCurrentPage(0);
    setScreen("results");
  };

  const resetToUpload = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
    setPages([]);
    setStatus("");
    setScreen("upload");
  };

  useEffect(() => {
    const handler = (e) => {
      if (screen !== "results") return;
      if (e.key === "ArrowLeft") setCurrentPage((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight")
        setCurrentPage((p) => Math.min(pages.length - 1, p + 1));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [screen, pages.length]);

  const multiSource = files.length > 1;
  const p = pages[currentPage];

  return (
    <div className="wrap">
      {screen === "upload" && (
        <>
          <header className="top">
            <h1>Show your work.</h1>
            <p>
              Upload a photo of a math problem. If a page has more than one
              numbered question, each one gets solved on its own page.
            </p>
          </header>

          <div
            className={"dropzone" + (dragActive ? " drag" : "")}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
            }}
          >
            <span className="icon">✎</span>
            <div className="primary-txt">
              Drop a photo here, or <span className="browse">browse</span>
            </div>
            <div className="secondary-txt">You can add more than one photo.</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />

          {files.length > 0 && (
            <div className="thumbs">
              {files.map((f, i) => (
                <div className="thumb" key={f.url}>
                  <img src={f.url} alt={`Uploaded photo ${i + 1}`} />
                  <div className="label">Photo {i + 1}</div>
                  <div className="remove" onClick={() => removeFile(i)}>
                    &times;
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="actions-row">
            <button
              className="btn-solve"
              disabled={files.length === 0}
              onClick={solveAll}
            >
              Solve it
            </button>
            <span className={"status-line" + (statusError ? " error" : "")}>
              {status}
            </span>
          </div>

          <div className="disclaimer">
            Solutions are generated by AI and may occasionally get a step
            wrong — check the working against your own notes before turning
            it in.
          </div>
        </>
      )}

      {screen === "loading" && (
        <div className="loading-state">
          <div className="spinner" />
          <div>{loadingText}</div>
        </div>
      )}

      {screen === "results" && p && (
        <>
          <div className="nav-bar">
            <button className="btn-ghost" onClick={resetToUpload}>
              &larr; Upload more
            </button>
            <span className="counter">
              Page {currentPage + 1} of {pages.length}
            </span>
            <div className="nav-arrows">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((c) => Math.max(0, c - 1))}
              >
                &larr;
              </button>
              <button
                disabled={currentPage === pages.length - 1}
                onClick={() =>
                  setCurrentPage((c) => Math.min(pages.length - 1, c + 1))
                }
              >
                &rarr;
              </button>
            </div>
          </div>

          <div className="page-card">
            <div className="q-label">Question {p.number}</div>
            {multiSource && (
              <div className="source-tag">from photo {p.sourceIndex + 1}</div>
            )}
            <div
              className="problem-block"
              dangerouslySetInnerHTML={{ __html: escapeHtml(p.problem) }}
            />
            <hr className="rule-break" />
            <div
              className="solution-block"
              dangerouslySetInnerHTML={{ __html: escapeHtml(p.solution) }}
            />
            {p.answer && (
              <div className="answer-box">
                <div className="answer-label">Answer</div>
                <div dangerouslySetInnerHTML={{ __html: escapeHtml(p.answer) }} />
              </div>
            )}
          </div>

          {pages.length <= 12 && (
            <div className="dots">
              {pages.map((_, i) => (
                <button
                  key={i}
                  className={i === currentPage ? "active" : ""}
                  onClick={() => setCurrentPage(i)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {screen === "empty" && (
        <div className="empty-state">
          <h3>{emptyTitle}</h3>
          <p style={{ marginTop: 8, fontSize: 14 }}>{emptyMsg}</p>
          <div style={{ marginTop: 20 }}>
            <button className="btn-solve" onClick={resetToUpload}>
              Try another photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
