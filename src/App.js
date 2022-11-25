import "./App.css"
import { Game } from "./components/Game"
import { Box } from "@chakra-ui/react"
import { Home } from "./components/Home"
import { useState } from "react"
import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
	apiKey: process.env.REACT_APP_apiKey,
	authDomain: process.env.REACT_APP_authDomain,
	projectId: process.env.REACT_APP_projectId,
	storageBucket: process.env.REACT_APP_storageBucket,
	messagingSenderId: process.env.REACT_APP_messagingSenderId,
	appId: process.env.REACT_APP_appId,
	measurementId: process.env.REACT_APP_measurementId,
	databaseURL: process.env.REACT_APP_databaseURL,
}

const app = initializeApp(firebaseConfig)

export const db = getDatabase(app)

function App() {
	const tileIds = []
	const [gameMode, setGameMode] = useState(null)
	const [onlineRoomId, setOnlineRoomId] = useState(null)
	for (let i = 0; i < 64; i++) {
		tileIds.push(Math.ceil(Math.random() * 10))
	}
	return (
		<Box h="100vh" w="fit-content" boxSizing="border-box" p="30px auto">
			{gameMode ? (
				<Game onlineRoomId={onlineRoomId} gameMode={gameMode} setGameMode={setGameMode} tileIds={tileIds} setOnlineRoomId={setOnlineRoomId} />
			) : (
				<Home setOnlineRoomId={setOnlineRoomId} setGameMode={setGameMode} />
			)}
		</Box>
	)
}

export default App
