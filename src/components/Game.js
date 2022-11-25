import { Box, Button, Flex, Image, Input, Text } from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { db } from "../App"
import { Controls } from "./Controls"
import { GridBox } from "./GridBox"
import uniqid from "uniqid"
import { onChildAdded, onValue, ref, set } from "firebase/database"

export const characterData = {
	Knight: {
		name: "Knight",
		health: 60,
		moveEnergy: 2,
		turnEnergy: 4,
		weakness: 0,
		attackDiscount: 0,
		incomingDamageMulti: 1,
		imgSrcs: ["/pixelassets/heroes/knight/knight_idle_anim_f0.png", "/pixelassets/heroes/knight/knight_idle_anim_f4.png"],
	},
	Eye: {
		name: "Flying Eyeball",
		health: 50,
		moveEnergy: 1,
		turnEnergy: 4,
		weakness: 0,
		attackDiscount: 0,
		incomingDamageMulti: 1,
		imgSrcs: ["/pixelassets/enemies/flying_creature/fly_anim_f1.png", "/pixelassets/enemies/flying_creature/fly_anim_f2.png"],
	},
}

export const Game = ({ tileIds, setGameMode, gameMode, onlineRoomId, setOnlineRoomId }) => {
	const gridIds = [1, 2, 3, 4, 5, 6, 7, 8]
	const [playerOneCharacter, setPlayerOneCharacter] = useState("")
	const [playerTwoCharacter, setPlayerTwoCharacter] = useState("")
	const playerOneCharacterRef = useRef({})
	const playerTwoCharacterRef = useRef({})
	playerOneCharacterRef.current = playerOneCharacter
	playerTwoCharacterRef.current = playerTwoCharacter

	const [playerOne, setPlayerOne] = useState(null)
	const [playerTwo, setPlayerTwo] = useState(null)
	const playerOneRef = useRef({})
	const playerTwoRef = useRef({})
	playerOneRef.current = playerOne
	playerTwoRef.current = playerTwo

	const [turn, setTurn] = useState(1)
	const turnRef = useRef({})
	turnRef.current = turn
	const GridLine = ({ dataLineId }) => {
		return (
			<Flex>
				{gridIds.map((id) => (
					<GridBox key={id} playerOne={playerOne} playerTwo={playerTwo} tileIds={tileIds} dataLineId={dataLineId} dataBoxId={id} />
				))}
			</Flex>
		)
	}

	useEffect(() => {
		const listenForCharacters = async () => {
			if (gameMode === "onlinehost") {
				const query = ref(db, "rooms/" + onlineRoomId + "/characterTwo")
				return onValue(query, async (snapshot) => {
					if (snapshot.exists()) {
						if (snapshot.val().name) {
							setTimeout(() => setPlayerTwoCharacter(snapshot.val().name), 0)
							setTimeout(() => confirmPlayerTwoSelection(), 100)
						}
					}
				})
			} else if (gameMode === "onlinejoin") {
				const query = ref(db, "rooms/" + onlineRoomId + "/characterOne")
				return onValue(query, async (snapshot) => {
					if (snapshot.exists()) {
						if (snapshot.val().name) {
							setTimeout(() => setPlayerOneCharacter(snapshot.val().name), 0)
							setTimeout(() => confirmPlayerOneSelection(), 100)
						}
					}
				})
			}
		}
		if (gameMode === "onlinehost" || gameMode === "onlinejoin") {
			listenForCharacters()
		}
	}, [onlineRoomId])

	const confirmPlayerOneSelection = async () => {
		setPlayerOne({ position: { x: 1, y: 8 }, energy: 4, ...characterData[playerOneCharacterRef.current] })
		if (gameMode === "onlinehost") {
			await set(ref(db, "rooms/" + onlineRoomId + "/characterOne"), {
				name: playerOneCharacterRef.current,
			})
		}
	}

	const confirmPlayerTwoSelection = async () => {
		setPlayerTwo({ position: { x: 8, y: 1 }, energy: 4, ...characterData[playerTwoCharacterRef.current] })
		if (gameMode === "onlinejoin") {
			await set(ref(db, "rooms/" + onlineRoomId + "/characterTwo"), {
				name: playerTwoCharacterRef.current,
			})
		}
	}

	return (
		<Flex w="100vw" flexFlow={"column nowrap"} color={"white"}>
			<Flex w="100%" justify={"space-between"} boxSizing={"border-box"} p="20px">
				<Box boxSizing="border-box" p="20px" bgColor="rgba(76,119,81,0.7)" backdropFilter={"blur(4px)"} w="330px" fontSize={"1.3em"}>
					{playerOne ? (
						<>
							<Text fontSize={"1.5em"}>{playerOne.name}</Text>
							<Text marginBottom={"5px"}>
								Health: <strong>{playerOne.health}</strong>
							</Text>
							<Text marginBottom={"5px"} marginTop={"5px"}>
								Energy: <strong>{playerOne.energy}</strong>
							</Text>
							<Text marginTop={"5px"}>
								Movement Cost: <strong>{playerOne.moveEnergy}</strong>
							</Text>
						</>
					) : gameMode === "onlinehost" || gameMode === "local" ? (
						<>
							<Image
								w="64px"
								h="64px"
								bgColor={"white"}
								p="4px"
								m="4px"
								borderRadius={"4px"}
								border={"1px solid grey"}
								className={playerOneCharacter === "Knight" ? "character selected" : "character"}
								src={characterData.Knight.imgSrcs[0]}
								onClick={() => setPlayerOneCharacter("Knight")}
							/>
							<Image
								w="64px"
								h="64px"
								bgColor={"white"}
								p="4px"
								m="4px"
								borderRadius={"4px"}
								border={"1px solid grey"}
								className={playerOneCharacter === "Eye" ? "character selected" : "character"}
								src={characterData.Eye.imgSrcs[0]}
								onClick={() => setPlayerOneCharacter("Eye")}
							/>
							<Button onClick={confirmPlayerOneSelection}>Confirm Selection</Button>
						</>
					) : null}
				</Box>
				{playerOne && playerTwo ? (
					<Flex position={"relative"} border="2px solid black" flexFlow={"column nowrap"}>
						<Box
							opacity={"0"}
							transitionTimingFunction={"linear"}
							id="eyeshot"
							position={"absolute"}
							borderRadius="4px"
							w="8px"
							h="8px"
							bgColor={"red"}
						></Box>
						<Box
							opacity={"0"}
							transitionTimingFunction={"linear"}
							id="bigeyeshot"
							position={"absolute"}
							borderRadius="8px"
							w="16px"
							h="16px"
							bgColor={"blue"}
						></Box>
						{gridIds.map((id) => (
							<GridLine key={id} dataLineId={id} />
						))}
					</Flex>
				) : null}
				<Box boxSizing="border-box" p="20px" bgColor="rgba(76,119,81,0.7)" backdropFilter={"blur(4px)"} fontSize={"1.3em"} w="330px">
					{playerTwo ? (
						<>
							<Text fontSize={"1.5em"}>{playerTwo.name}</Text>
							<Text marginBottom={"5px"}>
								Health: <strong>{playerTwo.health}</strong>
							</Text>
							<Text marginBottom={"5px"} marginTop={"5px"}>
								Energy: <strong>{playerTwo.energy}</strong>
							</Text>
							<Text marginTop={"5px"}>
								Movement Cost: <strong>{playerTwo.moveEnergy}</strong>
							</Text>
						</>
					) : gameMode === "onlinejoin" || gameMode === "local" ? (
						<>
							<Image
								w="64px"
								h="64px"
								bgColor={"white"}
								p="4px"
								m="4px"
								borderRadius={"4px"}
								border={"1px solid grey"}
								className={playerTwoCharacter === "Knight" ? "character selected" : "character"}
								src={characterData.Knight.imgSrcs[0]}
								onClick={() => setPlayerTwoCharacter("Knight")}
							/>
							<Image
								w="64px"
								h="64px"
								bgColor={"white"}
								p="4px"
								m="4px"
								borderRadius={"4px"}
								border={"1px solid grey"}
								className={playerTwoCharacter === "Eye" ? "character selected" : "character"}
								src={characterData.Eye.imgSrcs[0]}
								onClick={() => setPlayerTwoCharacter("Eye")}
							/>
							<Button onClick={confirmPlayerTwoSelection}>Confirm Selection</Button>
						</>
					) : null}
				</Box>
			</Flex>
			{playerOne && playerTwo ? (
				<Controls
					setGameMode={setGameMode}
					playerOneRef={playerOneRef}
					playerTwoRef={playerTwoRef}
					setPlayerOne={setPlayerOne}
					setPlayerTwo={setPlayerTwo}
					turnRef={turnRef}
					setTurn={setTurn}
					onlineRoomId={onlineRoomId}
					gameMode={gameMode}
					setOnlineRoomId={setOnlineRoomId}
				/>
			) : (
				<Flex justify={"center"} alignItems={"center"} position={"absolute"} bottom={"0"} left="0" w="100vw" h="300px" bgColor="rgba(119,81,76,0.7)">
					<Text>Room ID:{` ${onlineRoomId}`}</Text>
				</Flex>
			)}
		</Flex>
	)
}
