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

  useEffect(() => {
    async function getData() {
      try {
        const response = await fetch(
          `https://boardgamegeek.com/xmlapi/collection/HaggbartSlark?own=1"`
        );
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
        <GameList data={data} sortBy={sortBy} sortHandler={sortHandler} />
      )}
    </ul>
  );

  function sortHandler(e) {
    console.log(sortBy, e.target.id);
    sortBy[0] === e.target.id
      ? setSortBy(() => [`${e.target.id}`, !sortBy[1]])
      : setSortBy(() => [e.target.id, true]);
  }
}

function filterResult(data) {
  console.log(data);
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
  console.log(normalArray);
  return normalArray;
}

function GameList({ data, sortBy, sortHandler }) {
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

  return (
    <div ref={animationParent}>
      <div
        className="list-item"
        style={{
          backgroundColor: "black",
          color: "white",
          fontSize: "1.6rem",
        }}
      >
        <p>Sort by</p>
        <p
          id="gameName"
          onClick={sortHandler}
          className="sort-button"
          style={{ marginRight: "10rem" }}
        >
          Name
        </p>
        <p id="yearPublished" onClick={sortHandler} className="sort-button">
          Year
        </p>
        <p></p>
        <p></p>
        <p id="rating" onClick={sortHandler} className="sort-button">
          Rating
        </p>
        <p id="numPlays" onClick={sortHandler} className="sort-button">
          Plays
        </p>
        <p id="avgRating" onClick={sortHandler} className="sort-button">
          Avg. rating
        </p>
        <p id="geekRating" onClick={sortHandler} className="sort-button">
          Geek rating
        </p>
        <p id="delta" onClick={sortHandler} className="sort-button">
          Rating vs average
        </p>
      </div>
      {sorted.map((el, index) => (
        <Game
          key={el.gameName}
          el={el}
          background={index % 2 ? "#e3f2fa" : "#fff0fa"}
        />
      ))}
    </div>
  );
}

function Game({ el, background }) {
  return (
    <div className="list-item" style={{ backgroundColor: background }}>
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
    </div>
  );
}
