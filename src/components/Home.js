import { Box, Button, Flex, Heading, Input, Text } from "@chakra-ui/react"
import uniqid from "uniqid"
import { onDisconnect, ref, set, remove, get } from "firebase/database"
import { db } from "../App"
import { useState } from "react"
export const Home = ({ gameMode, setGameMode, setOnlineRoomId }) => {
	const [joinScreen, setJoinScreen] = useState(false)
	const [joinRoomField, setJoinRoomField] = useState("")
	const [joinRoomError, setJoinRoomError] = useState(null)
	const onlineHost = () => {
		setGameMode("onlinehost")
		const roomId = uniqid()
		setOnlineRoomId(roomId)
		const roomRef = ref(db, "rooms/" + roomId)
		set(roomRef, {
			roomId: roomId,
		})
		onDisconnect(roomRef).remove()
	}

	const joinRoom = async (event) => {
		event.preventDefault()
		const roomId = joinRoomField
		const roomRef = ref(db, "rooms/" + roomId)
		const roomData = await get(roomRef)
		if (roomData.exists()) {
			setGameMode("onlinejoin")
			setOnlineRoomId(roomId)
		} else {
			setJoinRoomError("Room ID not found")
		}
	}

	const handleRoomChange = (event) => {
		setJoinRoomField(event.target.value)
		if (joinRoomError) {
			setJoinRoomError(null)
		}
	}

	return (
		<Flex position={"absolute"} bottom="0" left="0" w="100vw" h="100vh">
			<Flex
				m="auto auto"
				h="fit-content"
				minH="40%"
				w="50%"
				flexFlow={"column nowrap"}
				gap="20px"
				fontSize={"1.5em"}
				justify="flex-start"
				alignItems={"center"}
				boxSizing="border-box"
				p="30px"
				bgColor="rgba(119,81,76,0.7)"
				backdropFilter={"blur(4px)"}
			>
				<Heading fontWeight="400" color={"white"}>
					Grid Fight
				</Heading>
				{joinScreen ? (
					<>
						<form onSubmit={joinRoom}>
							<Input margin="0 5px" type="text" required value={joinRoomField} onChange={handleRoomChange} placeholder="Room ID" />
							<Button margin="0 5px" type="submit">
								Join
							</Button>
							<Button margin="0 5px" onClick={() => setJoinScreen(false)}>
								Cancel
							</Button>
							<br />
							{joinRoomError ? (
								<Text color={"red"} fontSize={"1.1em"}>
									{joinRoomError}
								</Text>
							) : null}
						</form>
					</>
				) : (
					<>
						<Button bgColor="rgba(76,119,81,0.7)" color={"white"} h="40px" w="110px" onClick={() => setGameMode("local")}>
							Local Game
						</Button>
						<Button onClick={onlineHost} bgColor="rgba(76,119,81,0.7)" color={"white"} h="40px" w="110px">
							Host Game
						</Button>
						<Button onClick={() => setJoinScreen(true)} bgColor="rgba(76,119,81,0.7)" color={"white"} h="40px" w="110px">
							Join Game
						</Button>
					</>
				)}
			</Flex>
		</Flex>
	)
}
