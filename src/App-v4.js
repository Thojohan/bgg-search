import React, { useEffect, useState, useRef } from "react";
import XMLParser from "react-xml-parser";
import { useAutoAnimate } from "@formkit/auto-animate/react";

export default function App() {
  const [search, setSearch] = useState("");

  return (
    <div className="App">
      <Form onSearch={setSearch} search={search} />
      {search && <FetchGames search={search} />}
    </div>
  );
}

function Form({ onSearch }) {
  const formRef = useRef();
  function submitHandler(e) {
    e.preventDefault();
    if (!formRef.current.value) return;
    onSearch(formRef.current.value);
  }

  return (
    <div className="form-container">
      <p>Type in a valid BoardGameGeek username to get game collection</p>
      <form onSubmit={submitHandler}>
        <input type="text" ref={formRef}></input>
        <button> Search </button>
      </form>
    </div>
  );
}

function FetchGames({ search }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("gameName");
  const [activeGame, setActiveGame] = useState(null);

  useEffect(() => {
    async function getData() {
      try {
        const response = await fetch(
          `https://boardgamegeek.com/xmlapi/collection/${search}?own=1`
        );
        console.log(response);
        if (!response.ok) {
          throw new Error(
            `This is an HTTP error: The status is ${response.status}`
          );
        }
        const xmlData = await response.text();
        const jsonData = await new XMLParser().parseFromString(xmlData);
        const filtered = filterResult(jsonData.children);
        setData(filtered);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [search]);

  return (
    <ul className="game-list">
      {" "}
      {loading && (
        <center>
          <div style={{ fontSize: "4rem" }}>Loading</div>
        </center>
      )}
      {error && (
        <center>
          <div style={{ fontSize: "4rem" }}>
            Oops, something went wrong. If you search too often, BGG will
            throttle your request. Wait a minute and try again! Error: {error}
          </div>
        </center>
      )}
      {data && (
        <GameList
          data={data}
          sortBy={sortBy}
          sortHandler={sortHandler}
          activeGame={activeGame}
          setActiveGame={setActiveGame}
        />
      )}
    </ul>
  );

  function sortHandler(e) {
    setActiveGame(null);
    sortBy[0] === e.target.id
      ? setSortBy(() => [`${e.target.id}`, !sortBy[1]])
      : setSortBy(() => [e.target.id, true]);
  }
}

function filterResult(data) {
  const normalArray = data.map((el) => {
    const ch = el.children;

    const id = +el.attributes.objectid;

    const thumbnail = ch.reduce(
      (acc, el) => (el.name === "thumbnail" ? acc + el.value : acc),
      ""
    );
    const gameName = ch
      .reduce((acc, el) => (el.name === "name" ? acc + el.value : acc), "")
      .replaceAll("amp;", "")
      .replaceAll("&#039;", "'");

    const yearPublished = ch.reduce(
      (acc, el) => (el.name === "yearpublished" ? acc + el.value : acc),
      ""
    );

    const numPlays = ch.reduce(
      (acc, el) => (el.name === "numplays" ? +el.value + acc : acc),
      0
    );

    const attributes = ch.reduce(
      (acc, el) => (el.name === "stats" ? { ...acc, ...el.attributes } : acc),
      {}
    );

    const [ratings] = ch.reduce(
      (acc, el) => (el.name === "stats" ? [...el.children] : acc),
      []
    );

    const avgRating = ratings.children.reduce(
      (acc, el) => (el.name === "average" ? +el.attributes.value + acc : acc),
      0
    );

    const geekRating = ratings.children.reduce(
      (acc, el) =>
        el.name === "bayesaverage" ? +el.attributes.value + acc : acc,
      0
    );

    const delta = Math.abs(+avgRating - +ratings.attributes.value).toFixed(2);

    return {
      id,
      gameName,
      thumbnail,
      yearPublished,
      numPlays,
      rating: +ratings.attributes.value || "",
      avgRating,
      geekRating,
      delta: +delta === +delta ? +delta : "",
      minPlayers: attributes.minplayers,
      maxPlayers: attributes.maxplayers,
      minPlayTime: attributes.minplaytime,
      maxPlayTime: attributes.maxplaytime,
    };
  });
  return normalArray;
}

function GameList({ data, sortBy, sortHandler, activeGame, setActiveGame }) {
  const [animationParent] = useAutoAnimate({
    duration: 500,
  });

  const sorted = data.toSorted((a, b) => {
    let sortResult;
    if (sortBy[0] === "gameName") {
      sortBy[1] === true
        ? (sortResult = a[sortBy[0]].localeCompare(b[sortBy[0]]))
        : (sortResult = b[[sortBy[0]]].localeCompare(a[sortBy[0]]));
    }
    if (sortBy[0] !== "gameName") {
      if (sortBy[1]) sortResult = b[sortBy[0]] - a[sortBy[0]];
      if (!sortBy[1]) sortResult = a[sortBy[0]] - b[sortBy[0]];
    }
    return sortResult;
  });

  function handleActive(e) {
    e.target.closest(".list-item").id === activeGame
      ? setActiveGame(null)
      : setActiveGame(e.target.closest(".list-item").id);
  }

  return (
    <div ref={animationParent}>
      <div
        className="list-item"
        style={{
          backgroundColor: "black",
          color: "white",
          fontSize: "1.65rem",
        }}
      >
        <p>Sort by</p>
        <p
          id="gameName"
          onClick={sortHandler}
          className="clickable"
          style={{ marginRight: "10rem" }}
        >
          Name
        </p>
        <p id="yearPublished" onClick={sortHandler} className="clickable">
          Year
        </p>
        <p></p>
        <p></p>
        <p id="rating" onClick={sortHandler} className="clickable">
          Rating
        </p>
        <p id="numPlays" onClick={sortHandler} className="clickable">
          Plays
        </p>
        <p id="avgRating" onClick={sortHandler} className="clickable">
          Avg. rating
        </p>
        <p id="geekRating" onClick={sortHandler} className="clickable">
          Geek rating
        </p>
        <p id="delta" onClick={sortHandler} className="clickable">
          Rating vs average
        </p>
      </div>
      {sorted.map((el, index) => (
        <Game
          active={el.gameName === activeGame ? true : false}
          handleActive={handleActive}
          key={el.gameName}
          el={el}
          background={index % 2 ? "#e3f2fa" : "#fff0fa"}
        />
      ))}
    </div>
  );
}

function Game({ el, background, handleActive, active }) {
  const [animationParent] = useAutoAnimate({
    duration: 250,
  });
  return (
    <div
      className={`list-item clickable ${active && "active-element"}`}
      id={el.gameName}
      style={{ backgroundColor: active ? "white" : background }}
      onClick={handleActive}
    >
      <p style={{ width: "70px" }}>
        <img src={el.thumbnail} alt={el.gameName} />
      </p>
      <p style={{ width: "20rem" }}>📛 {el.gameName} </p>
      <p>📆 {el.yearPublished}</p>
      <p>
        👫{" "}
        {+el.minPlayers === +el.maxPlayers
          ? el.minPlayers
          : `${el.minPlayers}-${el.maxPlayers}`}{" "}
        players
      </p>
      <p>
        ⏲️ {(!el.minPlayTime || !el.maxPlayTime) && "?"}
        {el.minPlayTime &&
          el.maxPlayTime &&
          (+el.minPlayTime === +el.maxPlayTime
            ? el.maxPlayTime
            : `${el.minPlayTime}-${el.maxPlayTime}`)}{" "}
        min
      </p>
      <p>🗳️ Personal {el.rating || "N/A"}</p>
      <p>🎲 Plays {el.numPlays}</p>
      <p>📊 Average {el.avgRating}</p>
      <p>📈 Bayes avg. {el.geekRating}</p>
      <p>〽️ Delta {el.delta || "N/A"}</p>
      {active && (
        <div ref={animationParent} className="sub-info">
          <GameInfo gameID={el.id} />
        </div>
      )}
    </div>
  );
}

function GameInfo({ gameID }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animationParent] = useAutoAnimate({
    duration: 500,
  });

  useEffect(() => {
    async function getData() {
      try {
        const response = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(
            `https://boardgamegeek.com/xmlapi2/thing?id=${gameID}`
          )}`
        );
        if (!response.ok) {
          throw new Error(
            `This is an HTTP error: The status is ${response.status}`
          );
        }
        const xmlData = await response.text();
        const nicer = xmlData
          .replaceAll(`\\t`, "")
          .replaceAll(`\\n`, "")
          .replaceAll(`\\`, "");
        const jsonData = await new XMLParser().parseFromString(nicer);
        setGame(jsonData);
        setError(null);
      } catch (err) {
        setError(err.message);
        setGame(null);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, []);

  return (
    <div div ref={animationParent}>
      <div className="break"></div>
      {loading && (
        <div
          style={{
            fontSize: "1.5rem",
            width: "100%",
            textAlign: "center",
          }}
        >
          Loading
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: "1.2rem",
            width: "100%",
            textAlign: "center",
          }}
        >
          Oops, something went wrong. If you search too often, BGG will throttle
          your request. Wait a minute and try again! Error: {error}
        </div>
      )}
      {game && <InfoSegment game={game} />}
      <div />
    </div>
  );
}

function InfoSegment({ game }) {
  const gameInfo = game.children[0].children;
  const firstPublished = gameInfo.find((el) => el.name === "yearpublished")
    .attributes.value;
  const playerCountArray = gameInfo
    .find((el) => el.name === "poll")
    .children.map((el) => {
      return {
        count: el.attributes.numplayers,
        countArray: el.children.map((count) => {
          return {
            [count.attributes.value]: +count.attributes.numvotes,
          };
        }),
      };
    });
  const countResult = playerCountArray
    .map((pCount) => {
      const totalVotes = pCount.countArray.reduce((acc, el) => {
        if (el["Best"]) return acc + el["Best"];
        if (el["Recommended"]) return acc + el["Recommended"];
        if (el["Not Recommended"]) return acc + el["Not Recommended"];
        else return acc;
      }, 0);

      const score = pCount.countArray.reduce((acc, el) => {
        if (el["Best"]) return acc + el["Best"];
        if (el["Recommended"]) return acc + el["Recommended"] / 2;
        else return acc;
      }, 0);

      return {
        count: pCount.count,
        score,
        totalVotes,
        weighted: score / totalVotes || 0,
      };
    })
    .filter((el) => el.score >= 1 && el.totalVotes >= 1)
    .sort((a, b) => b.weighted - a.weighted);

  function stringBuilder(resultArray) {
    const excellent = countResult
      .slice(1)
      .filter((el) => el.weighted > 0.65)
      .reduce((acc, el) => acc + `${el.count}, `, "")
      .slice(0, -2);
    const veryGood = countResult
      .slice(1)
      .filter((el) => el.weighted <= 0.65 && el.weighted > 0.5)
      .reduce((acc, el) => acc + `${el.count}, `, "")
      .slice(0, -2);
    const okay = countResult
      .slice(1)
      .filter((el) => el.weighted <= 0.5 && el.weighted > 0.35)
      .reduce((acc, el) => acc + `${el.count}, `, "")
      .slice(0, -2);
    const notRecommended = countResult
      .slice(1)
      .filter((el) => el.weighted < 0.35)
      .reduce((acc, el) => acc + `${el.count}, `, "")
      .slice(0, -2);

    const playerCountString =
      ` Best with: ${countResult[0].count} players, ${
        excellent && `also excellent with: ${excellent} players, `
      }${veryGood && `very good with: ${veryGood} players, `}${
        okay && `okay with: ${okay} players, `
      }${
        notRecommended && `not recommended with: ${notRecommended} players, `
      }`.slice(0, -2) || "";
    return playerCountString;
  }

  const description = gameInfo
    .find((el) => el.name === "description")
    .value.replaceAll("&amp;", "")
    .replaceAll("#10;", "")
    .replaceAll("hellip", "")
    .replaceAll("ndash", "")
    .replaceAll("ldquo;", "")
    .replaceAll("rdquo;", "")
    .replaceAll("mdash;", "")
    .replaceAll("quot;")
    .replaceAll("nbsp", "")
    .replaceAll("undefined", "")
    .replaceAll("rsquo", "")
    .replaceAll("#", "")
    .replaceAll(/;[^\s]*/g, "");

  function fontSize(str) {
    if (str.length < 1000) return "1.2rem";
    if (str.length >= 1000 && str.length < 2000) return "0.97rem";
    if (str.length >= 2000) return "0.82rem";
  }

  return (
    <div className="list-item" style={{ fontSize: fontSize(description) }}>
      <p>{description}</p>
      <div className="flex-column">
        <p>{countResult.length > 0 && stringBuilder(countResult)}</p>
        <p>Year first published: {firstPublished}</p>
      </div>
    </div>
  );
}
