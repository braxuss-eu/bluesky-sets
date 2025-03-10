import { useState, useRef, useEffect } from "react";
import "./App.css";
import blueskyService from "./services/blueskyService";
import DelayedImage from "./components/DelayedImage";
import Hint from "./components/Hint";
import { utils, writeFileXLSX } from "xlsx";

function App() {
  const [result, setResult] = useState([]);

  const [following, setFollowing] = useState("");
  const [followed, setFollowed] = useState("");

  const [loading, setLoading] = useState(false);

  const progressRef = useRef({ ratio: 0.0, start: null, eta: null });
  const [progress, setProgress] = useState(progressRef.current);

  const [criteria, setCriteria] = useState(null);

  function setCriteriaUrl(criteria) {
    const url = new URL(window.location);
    url.searchParams.set("criteria", encodeURIComponent(btoa(JSON.stringify(criteria))));
    window.history.pushState({}, "", url);
  }

  function loadCriteriaFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const criteriaParam = urlParams.get("criteria");
    if (criteriaParam) {
      try {
        const parsedCriteria = JSON.parse(decodeURIComponent(atob(criteriaParam)));
        setFollowing(
          parsedCriteria.follow?.who.join(" ") +
            (parsedCriteria.doesntFollow ? " " + parsedCriteria.doesntFollow.who.map((x) => `-${x}`).join(" ") : "")
        );
        setFollowed(
          parsedCriteria.follower?.who.join(" ") +
            (parsedCriteria.notFollower ? " " + parsedCriteria.notFollower.who.map((x) => `-${x}`).join(" ") : "")
        );
      } catch (error) {
        console.error("Failed to parse criteria from URL", error);
      }
    }
  }

  useEffect(() => {
    // loadCriteriaFromUrl();
  }, []);

  const updateProgress = (a, b) => {
    const now = Date.now();
    var newProgress = { ...progressRef.current };
    if (!a) {
      newProgress = { ratio: 0, start: now, eta: null };
    } else {
      const start = newProgress.start || now;
      const seconds = (now - start) / 1000; // time in seconds
      const eta = Math.round(((b - a) * seconds) / a); // estimated time remaining in seconds
      newProgress = { ratio: a / b, start, eta };
    }
    // console.log("progress", a, b, newProgress.ratio, newProgress.start, (now - newProgress.start) / 1000, newProgress.eta);
    progressRef.current = newProgress;
    setProgress(newProgress);
  };

  async function load() {
    if (!loading) {
      setLoading(true);
      updateProgress();
      setResult([]);
    } else {
      return;
    }
    var followingHandles = following
      .trim()
      .split(/\s+/)
      .map((x) => x.replace(/^@/, ""))
      .filter((x) => x.length > 0)
      .map((x) => (x.indexOf(".") < 0 ? `${x}.bsky.social` : x));
    const notFollowingHandles = followingHandles
      .filter((x) => x.startsWith("-"))
      .map((x) => x.substring(1));
    followingHandles = followingHandles.filter((x) => !x.startsWith("-"));
    var followedHandles = followed
      .trim()
      .split(/\s+/)
      .map((x) => x.replace(/^@/, ""))
      .filter((x) => x.length > 0)
      .map((x) => (x.indexOf(".") < 0 ? `${x}.bsky.social` : x));
    const notFolowedHandles = followedHandles
      .filter((x) => x.startsWith("-"))
      .map((x) => x.substring(1));
    followedHandles = followedHandles.filter((x) => !x.startsWith("-"));
    let criteria = {
      follow: followingHandles.length
        ? { who: followingHandles, atLeastHowMany: null }
        : null,
      doesntFollow: notFollowingHandles.length
        ? { who: notFollowingHandles }
        : null,
      follower: followedHandles.length
        ? { who: followedHandles, atLeastHowMany: null }
        : null,
      notFollower: notFolowedHandles.length ? { who: notFolowedHandles } : null,
    };
    setCriteria(criteria);
    setCriteriaUrl(criteria);
    blueskyService
      .getWhoMeetsCriteria(criteria, updateProgress)
      .then((intersection) => {
        console.log("intersection", intersection);
        setResult([...intersection]);
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          console.log("Fetch aborted");
        } else {
          console.error("Another error occurred:", err);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {};
  }

  const buildCriteriaDescription = (criteria) => {
    const description = [];
    if (criteria?.follow) {
      description.push([
        `- Follows${
          criteria.follow.atLeastHowMany
            ? ` at least ${criteria.follow.atLeastHowMany} of `
            : " all of"
        } these accounts: ` + criteria.follow.who.join(", "),
      ]);
    }
    if (criteria?.doesntFollow) {
      description.push([
        `- Doesn't follow any of these accounts: ` +
          criteria.doesntFollow.who.join(", "),
      ]);
    }
    if (criteria?.follower) {
      description.push([
        `- Followed by${
          criteria.follower.atLeastHowMany
            ? ` at least ${criteria.follower.atLeastHowMany} of `
            : " all of"
        } these accounts: ` + criteria.follower.who.join(", "),
      ]);
    }
    if (criteria?.notFollower) {
      description.push([
        `- Not followed by any of these accounts: ` +
          criteria.notFollower.who.join(", "),
      ]);
    }
    return description;
  };

  const doExport = () => {
    const wb = utils.book_new();
    const data = [
      ...result.map((x) => ({
        handle: "@" + x.handle,
        displayName: x.displayName?.trim() || "@" + x.handle,
      })),
    ];
    const dataSheet = utils.sheet_new();
    const description = [
      ["This file was exported from Bluesky Sets."],
      [],
      ["https://bsky.app/profile/braxuss.eu"],
      [],
      [
        "This is the result of a query that searched for users who meet all the following criteria:",
      ],
    ].concat(buildCriteriaDescription(criteria));
    utils.sheet_add_aoa(dataSheet, description);
    utils.sheet_add_json(dataSheet, data, {
      skipHeader: false,
      origin: `A${description.length + 2}`,
    });
    utils.book_append_sheet(wb, dataSheet, "exported");
    dataSheet["!cols"] = [{ wch: 20 }, { wch: 40 }];
    writeFileXLSX(wb, "bluesky-sets-result.xlsx");
  };

  return (
    <>
      <h1>
        <div className="logo" />
        Bluesky Sets
      </h1>
      <div className="card">
        <p>Looking for every account that (at the same time):</p>
        <label htmlFor="folowing">
          Follows these accounts (@ handles separated by spaces).{" "}
          <Hint>
            You can express the opposite (doesn't follow) by prefixing a handle
            with a minus sign "-". Eg:&nbsp;-@someone
          </Hint>
        </label>
        <input
          type="search"
          id="folowing"
          style={{ width: "100%" }}
          value={following}
          onChange={(e) => setFollowing(e.target.value)}
        />
        <label htmlFor="followed">
          Followed by these accounts (@ handles separated by spaces).{" "}
          <Hint>
            You can express the opposite (not followed) by prefixing a handle
            with a minus sign "-". Eg:&nbsp;-@someone
          </Hint>
        </label>
        <input
          type="search"
          id="followed"
          style={{ width: "100%" }}
          value={followed}
          onChange={(e) => setFollowed(e.target.value)}
        />
        <br />
        <br />
        <div>
          <button onClick={() => load()} disabled={loading}>
            Search
          </button>
          {loading ? (
            <div>
              <progress value={progress.ratio} />
              <div className="notranslate"> {progress.eta ? progress.eta + " s" : null}</div>
            </div>
          ) : null}
        </div>
        {result?.length > 0 ? (
          <>
            <br />
            <div className="card">
              <label className="resultLabel">Criteria:</label>
              <ol className="criteria">
                {buildCriteriaDescription(criteria).map((x, i) => {
                  return <li key={Date.now() + "_" + i}>{x}</li>;
                })}
              </ol>
              <br />
              <br />
              <label className="resultLabel">Result ({result?.length}):</label>
              <button
                className="exportButton"
                onClick={() => doExport()}
              ></button>
              <ol className="result notranslate">
                {result.map((x, i) => {
                  return (
                    <li key={Date.now() + "_" + i} className="user">
                      <a
                        href={"https://bsky.app/profile/" + x.handle}
                        target="_blank"
                      >
                        <DelayedImage
                          pt={{ className: "avatar" }}
                          src={x.avatar}
                        />
                        <span className="displayName">
                          {x.displayName?.trim() || "@" + x.handle}
                        </span>
                        {x.displayName?.trim()?.length ? (
                          <span className="handle">@{x.handle}</span>
                        ) : null}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        ) : null}
      </div>
      <footer>
        <p>
          ©2024{" "}
          <a
            href="https://bsky.app/profile/braxuss.eu"
            title="Visit my Bluesky profile"
            target="_blank"
          >
            @braxuss
          </a>
          <a
            href="https://github.com/braxuss-eu/bluesky-sets"
            className="i-github"
            title="Get the code at GitHub"
            target=""
          ></a>
        </p>
      </footer>
    </>
  );
}

export default App;
