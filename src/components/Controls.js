import { Box, Button, Flex, Grid, Image, Text } from "@chakra-ui/react"
import { child, onValue, push, ref, remove, set, onChildAdded } from "firebase/database"
import { useEffect, useRef, useState } from "react"
import { db } from "../App"
import { characterData } from "./Game"

export const Controls = ({ playerOneRef, playerTwoRef, setPlayerOne, setPlayerTwo, turnRef, setTurn, setGameMode, onlineRoomId, gameMode }) => {
	const [targetedSquares, setTargetedSquares] = useState([])
	const targetRef = useRef({})
	targetRef.current = targetedSquares
	const [winner, setWinner] = useState(null)
	const [blocked, setBlocked] = useState(false)
	const [abilities, setAbilities] = useState({
		playerOne: [],
		playerTwo: [],
	})
	const abilityRef = useRef({})
	abilityRef.current = abilities

	useEffect(() => {
		const checkAbilities = () => {
			const abilityObjectOne = {}
			for (let ability of abilityRef.current.playerOne) {
				if (ability.turns < 1) {
					abilityObjectOne[ability.name] = ability.default
				} else {
					abilityObjectOne[ability.name] = ability.value
				}
			}
			setPlayerOne({ ...playerOneRef.current, ...abilityObjectOne })
			const abilityObjectTwo = {}
			for (let ability of abilityRef.current.playerTwo) {
				if (ability.turns < 1) {
					abilityObjectTwo[ability.name] = ability.default
				} else {
					abilityObjectTwo[ability.name] = ability.value
				}
			}
			setPlayerTwo({ ...playerTwoRef.current, ...abilityObjectTwo })
		}
		checkAbilities()
	}, [abilities])

	useEffect(() => {
		if ((gameMode === "onlinehost" || gameMode === "onlinejoin") && onlineRoomId !== null) {
			const query = ref(db, "rooms/" + onlineRoomId)

			return onChildAdded(query, async (snapshot) => {
				const data = snapshot.val()
				const dataKey = snapshot.ref._path.pieces_[2]
				if (
					((turnRef.current === 2 && gameMode === "onlinehost") || (turnRef.current === 1 && gameMode === "onlinejoin")) &&
					dataKey !== "roomId" &&
					dataKey !== "characterOne" &&
					dataKey !== "characterTwo"
				) {
					const move = data.name
					if (move) {
						console.log(move)
						if (move === "move") {
							if (turnRef.current === 1) {
								await setPlayerOne({
									...playerOneRef.current,
									position: { x: data.position.x, y: data.position.y },
									energy: playerOneRef.current.energy - playerOneRef.current.moveEnergy,
								})
							} else if (turnRef.current === 2) {
								await setPlayerTwo({
									...playerTwoRef.current,
									position: { x: data.position.x, y: data.position.y },
									energy: playerTwoRef.current.energy - playerTwoRef.current.moveEnergy,
								})
							}
						} else if (move === "endturn") {
							await endTurn()
						} else if (move === "attack") {
							if (data.attackName === "slash") {
								knightSlash(data.targets)
							} else if (data.attackName === "pierce") {
								knightPierce(data.targets)
							} else if (data.attackName === "lifedrain") {
								lifeDrain(data.targets)
							} else if (data.attackName === "wingslap") {
								wingSlap(data.targets)
							} else if (data.attackName === "bigjump") {
								knightJump()
							} else if (data.attackName === "eyeshoot") {
								eyeShoot()
							} else if (data.attackName === "bigeyeshoot") {
								bigEyeShoot()
							}
						} else if (move === "ability") {
							if (data.abilityName === "lightarmor") {
								knightLight()
							}
						}
						await remove(ref(db, "rooms/" + onlineRoomId + "/" + dataKey))
					}
				}
			})
		}
	}, [onlineRoomId])

	useEffect(() => {
		if (playerOneRef.current.health <= 0) {
			setTimeout(() => {
				setWinner("2")
				setTurn(1)
			}, 200)
		} else if (playerTwoRef.current.health <= 0) {
			setTimeout(() => {
				setWinner("1")
				setTurn(2)
			}, 200)
		}
	}, [playerOneRef.current, playerTwoRef.current])

	const endTurn = async () => {
		if (turnRef.current === 1) {
			if (gameMode === "onlinehost") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "endturn",
				})
			}
			const playerOneAbilities = abilityRef.current.playerOne
			const playerTwoAbilities = abilityRef.current.playerTwo
			for (let ability of abilityRef.current.playerOne) {
				playerOneAbilities[playerOneAbilities.indexOf(ability)].turns -= 1
			}
			await setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.turnEnergy })
			setAbilities({ ...abilityRef.current, playerTwo: playerTwoAbilities.filter((e) => e.turns > 0), playerOne: [...playerOneAbilities] })
			if (playerOneRef.current.turnEnergy < 12) {
				await setPlayerOne({ ...playerOneRef.current, energy: 0, turnEnergy: playerOneRef.current.turnEnergy + 1 })
			}
			await setTurn(2)
		} else if (turnRef.current === 2) {
			if (gameMode === "onlinejoin") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "endturn",
				})
			}
			const playerTwoAbilities = abilityRef.current.playerTwo
			const playerOneAbilities = abilityRef.current.playerOne
			for (let ability of abilityRef.current.playerTwo) {
				playerTwoAbilities[playerTwoAbilities.indexOf(ability)].turns -= 1
			}
			await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.turnEnergy })
			setAbilities({ ...abilityRef.current, playerOne: playerOneAbilities.filter((e) => e.turns > 0), playerTwo: [...playerTwoAbilities] })
			if (playerTwoRef.current.turnEnergy < 12) {
				await setPlayerTwo({ ...playerTwoRef.current, energy: 0, turnEnergy: playerTwoRef.current.turnEnergy + 1 })
			}
			await setTurn(1)
		}
	}

	const moveChar = async (direction) => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= playerOneRef.current.moveEnergy) {
			if (
				direction === "up" &&
				playerOneRef.current.position["y"] > 1 &&
				!(
					playerTwoRef.current.position["y"] === playerOneRef.current.position["y"] - 1 &&
					playerTwoRef.current.position["x"] === playerOneRef.current.position["x"]
				)
			) {
				await setPlayerOne({
					...playerOneRef.current,
					energy: playerOneRef.current.energy - playerOneRef.current.moveEnergy,
					position: { y: playerOneRef.current.position["y"] - 1, x: playerOneRef.current.position["x"] },
				})
				if (gameMode === "onlinehost") {
					console.log("write")
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerOneRef.current.position["y"], x: playerOneRef.current.position["x"] },
					})
				}
			} else if (
				direction === "down" &&
				playerOneRef.current.position["y"] < 8 &&
				!(
					playerTwoRef.current.position["y"] === playerOneRef.current.position["y"] + 1 &&
					playerTwoRef.current.position["x"] === playerOneRef.current.position["x"]
				)
			) {
				await setPlayerOne({
					...playerOneRef.current,
					energy: playerOneRef.current.energy - playerOneRef.current.moveEnergy,
					position: { y: playerOneRef.current.position["y"] + 1, x: playerOneRef.current.position["x"] },
				})
				if (gameMode === "onlinehost") {
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerOneRef.current.position["y"], x: playerOneRef.current.position["x"] },
					})
				}
			} else if (
				direction === "left" &&
				playerOneRef.current.position["x"] > 1 &&
				!(
					playerTwoRef.current.position["y"] === playerOneRef.current.position["y"] &&
					playerTwoRef.current.position["x"] === playerOneRef.current.position["x"] - 1
				)
			) {
				await setPlayerOne({
					...playerOneRef.current,
					energy: playerOneRef.current.energy - playerOneRef.current.moveEnergy,
					position: { y: playerOneRef.current.position["y"], x: playerOneRef.current.position["x"] - 1 },
				})
				if (gameMode === "onlinehost") {
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerOneRef.current.position["y"], x: playerOneRef.current.position["x"] },
					})
				}
			} else if (
				direction === "right" &&
				playerOneRef.current.position["x"] < 8 &&
				!(
					playerTwoRef.current.position["y"] === playerOneRef.current.position["y"] &&
					playerTwoRef.current.position["x"] === playerOneRef.current.position["x"] + 1
				)
			) {
				await setPlayerOne({
					...playerOneRef.current,
					energy: playerOneRef.current.energy - playerOneRef.current.moveEnergy,
					position: { y: playerOneRef.current.position["y"], x: playerOneRef.current.position["x"] + 1 },
				})
				if (gameMode === "onlinehost") {
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerOneRef.current.position["y"], x: playerOneRef.current.position["x"] },
					})
				}
			}
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= playerTwoRef.current.moveEnergy) {
			if (
				direction === "up" &&
				playerTwoRef.current.position["y"] > 1 &&
				!(
					playerOneRef.current.position["y"] === playerTwoRef.current.position["y"] - 1 &&
					playerOneRef.current.position["x"] === playerTwoRef.current.position["x"]
				)
			) {
				await setPlayerTwo({
					...playerTwoRef.current,
					energy: playerTwoRef.current.energy - playerTwoRef.current.moveEnergy,
					position: { y: playerTwoRef.current.position["y"] - 1, x: playerTwoRef.current.position["x"] },
				})
				if (gameMode === "onlinejoin") {
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerTwoRef.current.position["y"], x: playerTwoRef.current.position["x"] },
					})
				}
			} else if (
				direction === "down" &&
				playerTwoRef.current.position["y"] < 8 &&
				!(
					playerOneRef.current.position["y"] === playerTwoRef.current.position["y"] + 1 &&
					playerOneRef.current.position["x"] === playerTwoRef.current.position["x"]
				)
			) {
				await setPlayerTwo({
					...playerTwoRef.current,
					energy: playerTwoRef.current.energy - playerTwoRef.current.moveEnergy,
					position: { y: playerTwoRef.current.position["y"] + 1, x: playerTwoRef.current.position["x"] },
				})
				if (gameMode === "onlinejoin") {
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerTwoRef.current.position["y"], x: playerTwoRef.current.position["x"] },
					})
				}
			} else if (
				direction === "left" &&
				playerTwoRef.current.position["x"] > 1 &&
				!(
					playerOneRef.current.position["y"] === playerTwoRef.current.position["y"] &&
					playerOneRef.current.position["x"] === playerTwoRef.current.position["x"] - 1
				)
			) {
				await setPlayerTwo({
					...playerTwoRef.current,
					energy: playerTwoRef.current.energy - playerTwoRef.current.moveEnergy,
					position: { y: playerTwoRef.current.position["y"], x: playerTwoRef.current.position["x"] - 1 },
				})
				if (gameMode === "onlinejoin") {
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerTwoRef.current.position["y"], x: playerTwoRef.current.position["x"] },
					})
				}
			} else if (
				direction === "right" &&
				playerTwoRef.current.position["x"] < 8 &&
				!(
					playerOneRef.current.position["y"] === playerTwoRef.current.position["y"] &&
					playerOneRef.current.position["x"] === playerTwoRef.current.position["x"] + 1
				)
			) {
				await setPlayerTwo({
					...playerTwoRef.current,
					energy: playerTwoRef.current.energy - playerTwoRef.current.moveEnergy,
					position: { y: playerTwoRef.current.position["y"], x: playerTwoRef.current.position["x"] + 1 },
				})
				if (gameMode === "onlinejoin") {
					const newMove = push(ref(db, "rooms/" + onlineRoomId))
					await set(newMove, {
						name: "move",
						position: { y: playerTwoRef.current.position["y"], x: playerTwoRef.current.position["x"] },
					})
				}
			}
		}
	}

	const unPreview = () => {
		const gridBoxes = document.querySelectorAll(".grid-box")
		for (let box of gridBoxes) {
			box.style.filter = "unset"
		}
		setTargetedSquares([])
	}

	const unPreviewAbility = () => {
		document.querySelector("#player-one").style.filter = "unset"
		document.querySelector("#player-two").style.filter = "unset"
	}

	const previewKnightSlash = () => {
		let x
		let y
		const targets = []
		if (turnRef.current === 1) {
			y = playerOneRef.current.position["y"]
			x = playerOneRef.current.position["x"]
		} else {
			y = playerTwoRef.current.position["y"]
			x = playerTwoRef.current.position["x"]
		}
		const gridBoxes = document.querySelectorAll(
			`[data-line-id="${y + 1}"][data-box-id="${x}"],
				[data-line-id="${y - 1}"][data-box-id="${x}"],
				[data-line-id="${y}"][data-box-id="${x - 1}"],
				[data-line-id="${y}"][data-box-id="${x + 1}"]`
		)
		for (let box of gridBoxes) {
			box.style.filter = "brightness(70%)"
			targets.push({ y: Number(box.dataset.lineId), x: Number(box.dataset.boxId) })
		}
		setTargetedSquares(targets)
	}

	const knightSlash = async (targetData) => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 4 - playerOneRef.current.attackDiscount) {
			let targets
			if (gameMode === "onlinehost") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "slash",
					targets: targets,
				})
			} else if (gameMode === "onlinejoin") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "10px"
				setBlocked(true)
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "0"
			}, 200)
			setTimeout(async () => {
				for (let target of targets) {
					if (target["x"] === playerTwoRef.current.position["x"] && target["y"] === playerTwoRef.current.position["y"]) {
						setTimeout(() => (document.querySelector("#player-two").style.transform = "rotate(-20deg)"), 0)
						setTimeout(() => (document.querySelector("#player-two").style.transform = "rotate(20deg)"), 100)
						setTimeout(() => (document.querySelector("#player-two").style.transform = "unset"), 200)
						setTimeout(async () => {
							await setPlayerTwo({
								...playerTwoRef.current,
								health: playerTwoRef.current.health - (8 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti,
							})
							await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - (4 - playerOneRef.current.attackDiscount) })
							setBlocked(false)
						}, 300)
						return
					}
				}
				await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - (4 - playerOneRef.current.attackDiscount) })
				setBlocked(false)
			}, 400)
		}
		if (turnRef.current === 2 && playerTwoRef.current.energy >= 4 - playerOneRef.current.attackDiscount) {
			let targets
			if (gameMode === "onlinejoin") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "slash",
					targets: targets,
				})
			} else if (gameMode === "onlinehost") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "10px"
				setBlocked(true)
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "0"
			}, 200)
			setTimeout(async () => {
				for (let target of targets) {
					if (target["x"] === playerOneRef.current.position["x"] && target["y"] === playerOneRef.current.position["y"]) {
						setTimeout(() => (document.querySelector("#player-one").style.transform = "rotate(-20deg)"), 0)
						setTimeout(() => (document.querySelector("#player-one").style.transform = "rotate(20deg)"), 100)
						setTimeout(() => (document.querySelector("#player-one").style.transform = "unset"), 200)
						setTimeout(async () => {
							await setPlayerOne({
								...playerOneRef.current,
								health: playerOneRef.current.health - (8 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti,
							})
							await setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - (4 - playerOneRef.current.attackDiscount) })
							setBlocked(false)
						}, 300)
						return
					}
				}
				await setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - (4 - playerTwoRef.current.attackDiscount) })
				setBlocked(false)
			}, 400)
		}
	}

	const previewKnightPierce = () => {
		let x
		let y
		const targets = []
		if (turnRef.current === 1) {
			y = playerOneRef.current.position["y"]
			x = playerOneRef.current.position["x"]
		} else {
			y = playerTwoRef.current.position["y"]
			x = playerTwoRef.current.position["x"]
		}
		const gridBoxes = document.querySelectorAll(
			`[data-line-id="${y - 2}"][data-box-id="${x}"],
				[data-line-id="${y + 2}"][data-box-id="${x}"],
				[data-line-id="${y}"][data-box-id="${x + 2}"],
				[data-line-id="${y}"][data-box-id="${x - 2}"],
				[data-line-id="${y + 1}"][data-box-id="${x}"],
				[data-line-id="${y - 1}"][data-box-id="${x}"],
				[data-line-id="${y}"][data-box-id="${x - 1}"],
				[data-line-id="${y}"][data-box-id="${x + 1}"]`
		)
		for (let box of gridBoxes) {
			box.style.filter = "brightness(70%)"
			targets.push({ y: Number(box.dataset.lineId), x: Number(box.dataset.boxId) })
		}
		setTargetedSquares(targets)
	}

	const knightPierce = async (targetData) => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 2 - playerOneRef.current.attackDiscount) {
			let targets
			if (gameMode === "onlinehost") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "pierce",
					targets: targets,
				})
			} else if (gameMode === "onlinejoin") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "10px"
				setBlocked(true)
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "0"
			}, 200)
			setTimeout(async () => {
				for (let target of targets) {
					if (target["x"] === playerTwoRef.current.position["x"] && target["y"] === playerTwoRef.current.position["y"]) {
						setTimeout(() => (document.querySelector("#player-two").style.filter = "brightness(70%)"), 0)
						setTimeout(() => (document.querySelector("#player-two").style.filter = "unset"), 100)
						setTimeout(async () => {
							await setPlayerOne({
								...playerOneRef.current,
								energy: playerOneRef.current.energy - (2 - playerOneRef.current.attackDiscount),
							})
							await setPlayerTwo({
								...playerTwoRef.current,
								health: playerTwoRef.current.health - (3 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti,
							})
							setBlocked(false)
						}, 200)
						return
					}
				}
				await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - (2 - playerOneRef.current.attackDiscount) })
				setBlocked(false)
			}, 400)
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 2 - playerTwoRef.current.attackDiscount) {
			let targets
			if (gameMode === "onlinejoin") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "pierce",
					targets: targets,
				})
			} else if (gameMode === "onlinehost") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "10px"
				setBlocked(true)
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "0"
			}, 200)
			setTimeout(async () => {
				for (let target of targets) {
					if (target["x"] === playerOneRef.current.position["x"] && target["y"] === playerOneRef.current.position["y"]) {
						setTimeout(() => (document.querySelector("#player-one").style.filter = "brightness(70%)"), 0)
						setTimeout(() => (document.querySelector("#player-one").style.filter = "unset"), 100)
						setTimeout(async () => {
							await setPlayerTwo({
								...playerTwoRef.current,
								energy: playerTwoRef.current.energy - (2 - playerTwoRef.current.attackDiscount),
							})
							await setPlayerOne({
								...playerOneRef.current,
								health: playerOneRef.current.health - (3 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti,
							})
							setBlocked(false)
						}, 200)
						return
					}
				}
				await setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - (2 - playerTwoRef.current.attackDiscount) })
				setBlocked(false)
			}, 400)
		}
	}

	const previewKnightLight = () => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 6) {
			document.querySelector("#player-one").style.filter = "invert(20%) sepia(90%) saturate(1130%) hue-rotate(168deg) brightness(100%) contrast(83%)"
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 6) {
			document.querySelector("#player-two").style.filter = "invert(20%) sepia(90%) saturate(1130%) hue-rotate(168deg) brightness(100%) contrast(83%)"
		}
	}

	const knightLight = async () => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 6) {
			if (gameMode === "onlinehost") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "ability",
					abilityName: "lightarmor",
				})
			}
			setBlocked(true)
			setTimeout(() => {
				document.querySelector("#player-one").style.filter =
					"invert(10%) sepia(90%) saturate(1130%) hue-rotate(168deg) brightness(250%) contrast(83%) blur(2px)"
			}, 50)
			setTimeout(async () => {
				setAbilities({
					...abilityRef.current,
					playerOne: [
						...abilityRef.current.playerOne,
						{
							name: "moveEnergy",
							value: 1,
							turns: 3,
							default: 2,
						},
						{
							name: "attackDiscount",
							value: 1,
							turns: 3,
							default: 0,
						},
						{
							name: "incomingDamageMulti",
							value: 2,
							turns: 3,
							default: 1,
						},
					],
				})
				await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - 6 })
			}, 200)
			setTimeout(() => {
				setBlocked(false)
				document.querySelector("#player-one").style.filter = "unset"
			}, 500)
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 6) {
			if (gameMode === "onlinejoin") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "ability",
					abilityName: "lightarmor",
				})
			}
			setBlocked(true)
			setTimeout(() => {
				document.querySelector("#player-two").style.filter =
					"invert(10%) sepia(90%) saturate(1130%) hue-rotate(168deg) brightness(250%) contrast(83%) blur(2px)"
			}, 50)
			setTimeout(() => {
				setAbilities({
					...abilityRef.current,
					playerTwo: [
						...abilityRef.current.playerTwo,
						{
							name: "moveEnergy",
							value: 1,
							turns: 3,
							default: 2,
						},
						{
							name: "attackDiscount",
							value: 1,
							turns: 3,
							default: 0,
						},
						{
							name: "incomingDamageMulti",
							value: 2,
							turns: 3,
							default: 1,
						},
					],
				})
				setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - 6 })
			}, 200)
			setTimeout(() => {
				setBlocked(false)
				document.querySelector("#player-two").style.filter = "unset"
			}, 500)
		}
	}

	const previewKnightJump = () => {
		let x
		let y
		if (turnRef.current === 1) {
			y = playerTwoRef.current.position["y"]
			x = playerTwoRef.current.position["x"]
		} else {
			y = playerOneRef.current.position["y"]
			x = playerOneRef.current.position["x"]
		}
		if (x < 8) {
			document.querySelector(`[data-line-id="${y}"][data-box-id="${x + 1}"]`).style.filter = "brightness(70%)"
		} else {
			document.querySelector(`[data-line-id="${y}"][data-box-id="${x - 1}"]`).style.filter = "brightness(70%)"
		}
	}

	const knightJump = async () => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 10 - playerOneRef.current.attackDiscount) {
			if (gameMode === "onlinehost") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "bigjump",
				})
			}
			setBlocked(true)
			setTimeout(() => {
				document.querySelector("#player-one").style.filter = "invert(7%) sepia(68%) saturate(7056%) hue-rotate(359deg) brightness(96%) contrast(118%)"
			}, 50)
			setTimeout(async () => {
				if (playerTwoRef.current.position["x"] < 8) {
					await setPlayerOne({
						...playerOneRef.current,
						energy: playerOneRef.current.energy - (10 - playerOneRef.current.attackDiscount),
						position: { x: playerTwoRef.current.position["x"] + 1, y: playerTwoRef.current.position["y"] },
					})
				} else {
					await setPlayerOne({
						...playerOneRef.current,
						energy: playerOneRef.current.energy - (10 - playerOneRef.current.attackDiscount),
						position: { x: playerTwoRef.current.position["x"] - 1, y: playerTwoRef.current.position["y"] },
					})
				}
			}, 800)

			setTimeout(() => {
				document.querySelector("#player-one").style.top = "-30px"
				document.querySelector("#player-two").style.top = "-30px"
			}, 1000)
			setTimeout(() => {
				document.querySelector("#player-one").style.top = "0"
				document.querySelector("#player-two").style.top = "0"
				document.querySelector("#player-one").style.filter = "unset"
				document.querySelector("#player-two").style.filter = "invert(7%) sepia(68%) saturate(7056%) hue-rotate(359deg) brightness(96%) contrast(118%)"
			}, 1200)
			setTimeout(async () => {
				setBlocked(false)
				document.querySelector("#player-two").style.filter = "unset"
				setAbilities({
					...abilityRef.current,
					playerTwo: [
						...abilityRef.current.playerTwo,
						{
							name: "moveEnergy",
							value: playerTwoRef.current.moveEnergy + 1,
							default: playerTwoRef.current.moveEnergy,
							turns: 1,
						},
					],
				})
				await setPlayerTwo({
					...playerTwoRef.current,
					health: playerTwoRef.current.health - (20 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti,
				})
			}, 1300)
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 10 - playerTwoRef.current.attackDiscount) {
			if (gameMode === "onlinejoin") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "bigjump",
				})
			}
			setBlocked(true)
			setTimeout(() => {
				document.querySelector("#player-two").style.filter = "invert(7%) sepia(68%) saturate(7056%) hue-rotate(359deg) brightness(96%) contrast(118%)"
			}, 50)
			setTimeout(async () => {
				if (playerOneRef.current.position["x"] < 8) {
					await setPlayerTwo({
						...playerTwoRef.current,
						energy: playerTwoRef.current.energy - (10 - playerTwoRef.current.attackDiscount),
						position: { x: playerOneRef.current.position["x"] + 1, y: playerOneRef.current.position["y"] },
					})
				} else {
					await setPlayerTwo({
						...playerTwoRef.current,
						energy: playerTwoRef.current.energy - (10 - playerTwoRef.current.attackDiscount),
						position: { x: playerOneRef.current.position["x"] - 1, y: playerOneRef.current.position["y"] },
					})
				}
			}, 800)

			setTimeout(() => {
				document.querySelector("#player-two").style.top = "-30px"
				document.querySelector("#player-one").style.top = "-30px"
			}, 1000)
			setTimeout(() => {
				document.querySelector("#player-two").style.top = "0"
				document.querySelector("#player-one").style.top = "0"
				document.querySelector("#player-two").style.filter = "unset"
				document.querySelector("#player-one").style.filter = "invert(7%) sepia(68%) saturate(7056%) hue-rotate(359deg) brightness(96%) contrast(118%)"
			}, 1200)
			setTimeout(async () => {
				setBlocked(false)
				document.querySelector("#player-one").style.filter = "unset"
				setAbilities({
					...abilityRef.current,
					playerOne: [
						...abilityRef.current.playerOne,
						{
							name: "moveEnergy",
							value: playerOneRef.current.moveEnergy + 1,
							default: playerOneRef.current.moveEnergy,
							turns: 1,
						},
					],
				})
				await setPlayerOne({
					...playerOneRef.current,
					health: playerOneRef.current.health - (20 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti,
				})
			}, 1300)
		}
	}

	const eyeShoot = async () => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 1) {
			if (gameMode === "onlinehost") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "eyeshoot",
				})
			}
			setBlocked(true)
			const eyeShotDiv = document.querySelector("#eyeshot")
			eyeShotDiv.style.transition = "0ms"
			eyeShotDiv.style.opacity = "1"
			eyeShotDiv.style.top = `${24 + (playerOneRef.current.position["y"] - 1) * 48}px`
			eyeShotDiv.style.left = `${24 + (playerOneRef.current.position["x"] - 1) * 48}px`
			setTimeout(() => {
				eyeShotDiv.style.transition = "500ms"
				eyeShotDiv.style.top = `${24 + (playerTwoRef.current.position["y"] - 1) * 48}px`
				eyeShotDiv.style.left = `${24 + (playerTwoRef.current.position["x"] - 1) * 48}px`
			}, 50)
			setTimeout(() => {
				setBlocked(false)
				eyeShotDiv.style.opacity = "0"
				document.querySelector("#player-two").style.filter = "brightness(70%)"
			}, 550)
			setTimeout(async () => {
				document.querySelector("#player-two").style.filter = "unset"
				await setPlayerTwo({
					...playerTwoRef.current,
					health: playerTwoRef.current.health - (1 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti,
				})
				await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - 1 })
			}, 650)
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 1) {
			if (gameMode === "onlinejoin") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "eyeshoot",
				})
			}
			setBlocked(true)
			const eyeShotDiv = document.querySelector("#eyeshot")
			eyeShotDiv.style.transition = "0ms"
			eyeShotDiv.style.opacity = "1"
			eyeShotDiv.style.top = `${24 + (playerTwoRef.current.position["y"] - 1) * 48}px`
			eyeShotDiv.style.left = `${24 + (playerTwoRef.current.position["x"] - 1) * 48}px`
			setTimeout(() => {
				eyeShotDiv.style.transition = "500ms"
				eyeShotDiv.style.top = `${24 + (playerOneRef.current.position["y"] - 1) * 48}px`
				eyeShotDiv.style.left = `${24 + (playerOneRef.current.position["x"] - 1) * 48}px`
			}, 50)
			setTimeout(() => {
				setBlocked(false)
				eyeShotDiv.style.opacity = "0"
				document.querySelector("#player-one").style.filter = "brightness(70%)"
			}, 550)
			setTimeout(async () => {
				document.querySelector("#player-one").style.filter = "unset"
				await setPlayerOne({
					...playerOneRef.current,
					health: playerOneRef.current.health - (1 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti,
				})
				await setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - 1 })
			}, 650)
		}
	}

	const bigEyeShoot = async () => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 7) {
			if (gameMode === "onlinehost") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "bigeyeshoot",
				})
			}
			setBlocked(true)
			const eyeShotDiv = document.querySelector("#bigeyeshot")
			eyeShotDiv.style.transition = "0ms"
			eyeShotDiv.style.opacity = "1"
			eyeShotDiv.style.top = `${16 + (playerOneRef.current.position["y"] - 1) * 48}px`
			eyeShotDiv.style.left = `${16 + (playerOneRef.current.position["x"] - 1) * 48}px`
			setTimeout(() => {
				eyeShotDiv.style.transition = "800ms"
				eyeShotDiv.style.top = `${16 + (playerTwoRef.current.position["y"] - 1) * 48}px`
				eyeShotDiv.style.left = `${16 + (playerTwoRef.current.position["x"] - 1) * 48}px`
			}, 50)
			setTimeout(() => {
				setBlocked(false)
				eyeShotDiv.style.opacity = "0"
				document.querySelector("#player-two").style.filter = "brightness(70%)"
			}, 800)
			setTimeout(() => {
				document.querySelector("#player-two").style.filter = "unset"
			}, 850)
			setTimeout(() => {
				document.querySelector("#player-two").style.filter = "brightness(70%)"
			}, 900)
			setTimeout(async () => {
				document.querySelector("#player-two").style.filter = "unset"
				await setPlayerTwo({
					...playerTwoRef.current,
					health: playerTwoRef.current.health - (9 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti,
				})
				await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - 7 })
				setAbilities({
					...abilityRef.current,
					playerTwo: [
						...abilityRef.current.playerTwo,
						{
							name: "weakness",
							value: playerTwoRef.current.weakness + 1,
							default: playerTwoRef.current.weakness,
							turns: 1,
						},
					],
				})
			}, 950)
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 7) {
			if (gameMode === "onlinejoin") {
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "bigeyeshoot",
				})
			}
			setBlocked(true)
			const eyeShotDiv = document.querySelector("#bigeyeshot")
			eyeShotDiv.style.transition = "0ms"
			eyeShotDiv.style.opacity = "1"
			eyeShotDiv.style.top = `${16 + (playerTwoRef.current.position["y"] - 1) * 48}px`
			eyeShotDiv.style.left = `${16 + (playerTwoRef.current.position["x"] - 1) * 48}px`
			setTimeout(() => {
				eyeShotDiv.style.transition = "800ms"
				eyeShotDiv.style.top = `${16 + (playerOneRef.current.position["y"] - 1) * 48}px`
				eyeShotDiv.style.left = `${16 + (playerOneRef.current.position["x"] - 1) * 48}px`
			}, 50)
			setTimeout(() => {
				setBlocked(false)
				eyeShotDiv.style.opacity = "0"
				document.querySelector("#player-one").style.filter = "brightness(70%)"
			}, 800)
			setTimeout(() => {
				document.querySelector("#player-one").style.filter = "unset"
			}, 850)
			setTimeout(() => {
				document.querySelector("#player-one").style.filter = "brightness(70%)"
			}, 900)
			setTimeout(async () => {
				document.querySelector("#player-one").style.filter = "unset"
				await setPlayerOne({
					...playerOneRef.current,
					health: playerOneRef.current.health - (9 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti,
				})
				await setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - 7 })
				setAbilities({
					...abilityRef.current,
					playerOne: [
						...abilityRef.current.playerOne,
						{
							name: "weakness",
							value: playerOneRef.current.weakness + 1,
							default: playerOneRef.current.weakness,
							turns: 1,
						},
					],
				})
			}, 950)
		}
	}

	const previewWingSlap = () => {
		const targets = []
		let x
		let y
		if (turnRef.current === 1) {
			y = playerOneRef.current.position["y"]
			x = playerOneRef.current.position["x"]
		} else {
			y = playerTwoRef.current.position["y"]
			x = playerTwoRef.current.position["x"]
		}
		const gridBoxes = document.querySelectorAll(
			`[data-line-id="${y + 1}"][data-box-id="${x + 1}"],
				[data-line-id="${y - 1}"][data-box-id="${x + 1}"],
				[data-line-id="${y + 1}"][data-box-id="${x - 1}"],
				[data-line-id="${y - 1}"][data-box-id="${x - 1}"]`
		)
		for (let box of gridBoxes) {
			box.style.filter = "brightness(70%)"
			targets.push({ y: Number(box.dataset.lineId), x: Number(box.dataset.boxId) })
		}
		setTargetedSquares(targets)
	}

	const wingSlap = async (targetData) => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 2) {
			let targets
			setBlocked(true)
			if (gameMode === "onlinehost") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "wingslap",
					targets: targets,
				})
			} else if (gameMode === "onlinejoin") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "10px"
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "0"
			}, 100)
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "0"
				setBlocked(false)
			}, 200)
			setTimeout(() => {
				for (let target of targets) {
					if (target["x"] === playerTwoRef.current.position["x"] && target["y"] === playerTwoRef.current.position["y"]) {
						setPlayerTwo({
							...playerTwoRef.current,
							health: playerTwoRef.current.health - (4 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti,
						})
						setTimeout(() => (document.querySelector("#player-two").style.filter = "brightness(70%)"), 0)
						setTimeout(() => (document.querySelector("#player-two").style.filter = "unset"), 100)
						setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - 2 })
						setBlocked(false)
						return
					}
				}
				setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - 2 })
				setBlocked(false)
			}, 300)
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 2) {
			let targets
			setBlocked(true)
			if (gameMode === "onlinejoin") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "wingslap",
					targets: targets,
				})
			} else if (gameMode === "onlinehost") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "10px"
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "0"
			}, 100)
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "0"
			}, 200)
			setTimeout(() => {
				for (let target of targets) {
					if (target["x"] === playerOneRef.current.position["x"] && target["y"] === playerOneRef.current.position["y"]) {
						setPlayerOne({
							...playerOneRef.current,
							health: playerOneRef.current.health - (4 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti,
						})
						setTimeout(() => (document.querySelector("#player-one").style.filter = "brightness(70%)"), 0)
						setTimeout(() => (document.querySelector("#player-one").style.filter = "unset"), 100)
						setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - 2 })
						setBlocked(false)
						return
					}
					setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - 2 })
					setBlocked(false)
				}
			}, 300)
		}
	}

	const lifeDrain = async (targetData) => {
		if (turnRef.current === 1 && playerOneRef.current.energy >= 1) {
			let targets
			if (gameMode === "onlinehost") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "lifedrain",
					targets: targets,
				})
			} else if (gameMode === "onlinejoin") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "10px"
				setBlocked(true)
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-one").style.left = "0"
			}, 200)
			setTimeout(async () => {
				for (let target of targets) {
					if (target["x"] === playerTwoRef.current.position["x"] && target["y"] === playerTwoRef.current.position["y"]) {
						setTimeout(() => (document.querySelector("#player-two").style.filter = "brightness(70%)"), 0)
						setTimeout(() => (document.querySelector("#player-two").style.filter = "unset"), 100)
						setTimeout(async () => {
							await setPlayerOne({
								...playerOneRef.current,
								health: playerOneRef.current.health + 1 * playerTwoRef.current.incomingDamageMulti,
								energy: playerOneRef.current.energy - 1,
							})
							await setPlayerTwo({ ...playerTwoRef.current, health: playerTwoRef.current.health - 1 * playerTwoRef.current.incomingDamageMulti })
							setBlocked(false)
						}, 200)
						return
					}
				}
				await setPlayerOne({ ...playerOneRef.current, energy: playerOneRef.current.energy - 1 })
				setBlocked(false)
			}, 400)
		} else if (turnRef.current === 2 && playerTwoRef.current.energy >= 1) {
			let targets
			if (gameMode === "onlinejoin") {
				targets = [...targetRef.current]
				const newMove = push(ref(db, "rooms/" + onlineRoomId))
				await set(newMove, {
					name: "attack",
					attackName: "lifedrain",
					targets: targets,
				})
			} else if (gameMode === "onlinehost") {
				targets = targetData
			} else if (gameMode === "local") {
				targets = [...targetRef.current]
			}
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "10px"
				setBlocked(true)
			}, 0)
			setTimeout(() => {
				document.querySelector("#player-two").style.left = "0"
			}, 200)
			setTimeout(async () => {
				for (let target of targets) {
					if (target["x"] === playerOneRef.current.position["x"] && target["y"] === playerOneRef.current.position["y"]) {
						setTimeout(() => (document.querySelector("#player-one").style.filter = "brightness(70%)"), 0)
						setTimeout(() => (document.querySelector("#player-one").style.filter = "unset"), 100)
						setTimeout(async () => {
							await setPlayerTwo({
								...playerTwoRef.current,
								health: playerTwoRef.current.health + 1 * playerOneRef.current.incomingDamageMulti,
								energy: playerTwoRef.current.energy - 1,
							})
							await setPlayerOne({ ...playerOneRef.current, health: playerOneRef.current.health - 1 * playerOneRef.current.incomingDamageMulti })
							setBlocked(false)
						}, 200)
						return
					}
				}
				await setPlayerTwo({ ...playerTwoRef.current, energy: playerTwoRef.current.energy - 1 })
				setBlocked(false)
			}, 400)
		}
	}

	const restartGame = () => {
		setWinner(null)
		setPlayerOne(null)
		setPlayerTwo(null)
	}

	const cancelGame = () => {
		setWinner(null)
		setPlayerOne(null)
		setPlayerTwo(null)
		setGameMode(null)
	}

	const Blocker = () => {
		return <Box onClick={(e) => e.stopPropagation()} position={"absolute"} left="0" top="0" w="100vw" h="100vh" opacity={"0"} bgColor="#77514c"></Box>
	}

	const Winscreen = () => {
		return (
			<Flex
				justify={"center"}
				flexFlow={"column nowrap"}
				alignItems={"center"}
				onClick={(e) => e.stopPropagation()}
				position={"absolute"}
				left="0"
				top="0"
				w="100vw"
				h="100vh"
				bgColor="#77514c"
			>
				<Text>
					An epic showdown between the {playerOneRef.current.name} and the {playerTwoRef.current.name}. Player {winner} wins!
				</Text>
				<Button onClick={restartGame}>Play Again</Button>
				<Button onClick={cancelGame}>Home</Button>
			</Flex>
		)
	}

	return (
		<>
			<Flex
				position={"absolute"}
				h={"30vh"}
				bottom={"0"}
				left={"0"}
				w="100vw"
				justify={"space-between"}
				boxSizing="border-box"
				p="10px"
				bgColor="rgba(119,81,76,0.7)"
				backdropFilter={"blur(4px)"}
			>
				<Text w="25vw" textAlign={"center"} fontSize="1em">
					Player {turnRef.current}'s turn <br /> {onlineRoomId ? "Room ID:" + onlineRoomId : null}
				</Text>
				{(gameMode === "onlinehost" && turnRef.current === 1) || (gameMode === "onlinejoin" && turnRef.current === 2) || gameMode === "local" ? (
					<>
						<Grid w="20vw" justifySelf={"center"} gridTemplateRows={"1fr 1fr 1fr"} gridTemplateColumns={"1fr 1fr 1fr"}>
							<Button
								cursor="pointer"
								boxSizing="border-box"
								p="5px"
								onClick={() => moveChar("left")}
								gridColumn={"1 / span 1"}
								gridRow={"2 / span 1"}
								bg={"none"}
							>
								<Image h="50px" transform={"rotate(-180deg)"} src="/pixelassets/arrow.png" />
							</Button>
							<Button
								cursor="pointer"
								boxSizing="border-box"
								p="10px 0"
								onClick={() => moveChar("up")}
								gridColumn={"2 / span 1"}
								gridRow={"1 / span 1"}
								bg={"none"}
							>
								<Image h="50px" transform={"rotate(-90deg)"} src="/pixelassets/arrow.png" />
							</Button>
							<Button
								cursor="pointer"
								boxSizing="border-box"
								p="5px"
								onClick={() => moveChar("right")}
								gridColumn={"3 / span 1"}
								gridRow={"2 / span 1"}
								bg={"none"}
							>
								<Image h="50px" src="/pixelassets/arrow.png" />
							</Button>
							<Button
								cursor="pointer"
								boxSizing="border-box"
								p="10px 0"
								onClick={() => moveChar("down")}
								gridColumn={"2 / span 1"}
								gridRow={"3 / span 1"}
								bg={"none"}
							>
								<Image h="50px" transform={"rotate(90deg)"} src="/pixelassets/arrow.png" />
							</Button>
						</Grid>
						<Flex id="#moves" w="47vw" flexFlow="row wrap" gap="10px" justify={"space-between"}>
							{(turnRef.current === 1 && playerOneRef.current.name === "Knight") ||
							(turnRef.current === 2 && playerTwoRef.current.name === "Knight") ? (
								<>
									<Button
										bgColor="rgba(76,119,81,0.7)"
										cursor="pointer"
										color={"white"}
										h="40px"
										w="120px"
										role="group"
										onMouseOver={previewKnightSlash}
										onMouseOut={unPreview}
										onClick={knightSlash}
									>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "black transparent transparent transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-50%"
											opacity="0"
											transition="opacity 0.3s"
											h="110px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>
													Slash (
													{turnRef.current === 1 ? 4 - playerOneRef.current.attackDiscount : 4 - playerTwoRef.current.attackDiscount}{" "}
													energy)
												</strong>
												<br />
												Swing your sword and deal{" "}
												{turnRef.current === 1
													? (8 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti
													: (8 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti}{" "}
												damage to any close range enemies.
											</Text>
										</Box>
										Slash ({turnRef.current === 1 ? 4 - playerOneRef.current.attackDiscount : 4 - playerTwoRef.current.attackDiscount})
									</Button>
									<Button
										bgColor="rgba(76,119,81,0.7)"
										cursor="pointer"
										color={"white"}
										borderRadius="5px"
										h="40px"
										w="120px"
										role="group"
										onMouseOver={previewKnightPierce}
										onMouseOut={unPreview}
										onClick={knightPierce}
									>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "black transparent transparent transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-50%"
											opacity="0"
											transition="opacity 0.3s"
											h="110px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>
													Pierce (
													{turnRef.current === 1 ? 2 - playerOneRef.current.attackDiscount : 2 - playerTwoRef.current.attackDiscount}{" "}
													energy)
												</strong>
												<br />
												Lunge forward and deal{" "}
												{turnRef.current === 1
													? (3 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti
													: (3 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti}{" "}
												damage to an enemy at a slight range.
											</Text>
										</Box>
										Pierce ({turnRef.current === 1 ? 2 - playerOneRef.current.attackDiscount : 2 - playerTwoRef.current.attackDiscount})
									</Button>
									<Button
										bgColor="rgba(76,119,81,0.7)"
										cursor="pointer"
										color={"white"}
										role="group"
										position="relative"
										h="40px"
										w="140px"
										onMouseOver={previewKnightLight}
										onMouseOut={unPreviewAbility}
										onClick={knightLight}
									>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "transparent transparent rgba(76,119,81,0.7) transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-50%"
											opacity="0"
											transition="opacity 0.3s"
											h="170px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>Light Armor (6 energy)</strong>
												<br />
												For this turn and the next 2 turns, all movements and attacks cost 1 less energy. Incoming attacks deal double
												damage while light armor is active.
											</Text>
										</Box>
										Light Armor (6)
									</Button>
									<Button
										bgColor="rgba(76,119,81,0.7)"
										cursor="pointer"
										color={"white"}
										h="40px"
										w="180px"
										role="group"
										onMouseOver={previewKnightJump}
										onMouseOut={unPreview}
										onClick={knightJump}
									>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "black transparent transparent transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-10%"
											opacity="0"
											transition="opacity 0.3s"
											h="170px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>
													Jumping Attack (
													{turnRef.current === 1
														? 10 - playerOneRef.current.attackDiscount
														: 10 - playerTwoRef.current.attackDiscount}{" "}
													energy)
												</strong>
												<br />
												Jump to the opponent from anywhere on the board and knock them in the air dealing{" "}
												{turnRef.current === 1
													? (20 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti
													: (20 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti}{" "}
												damage. Their movement costs 1 more energy next turn.
											</Text>
										</Box>
										Jumping Attack (
										{turnRef.current === 1 ? 10 - playerOneRef.current.attackDiscount : 10 - playerTwoRef.current.attackDiscount})
									</Button>
								</>
							) : (turnRef.current === 1 && playerOneRef.current.name === "Flying Eyeball") ||
							  (turnRef.current === 2 && playerTwoRef.current.name === "Flying Eyeball") ? (
								<>
									<Button
										bgColor="rgba(76,119,81,0.7)"
										cursor="pointer"
										color={"white"}
										h="40px"
										w="130px"
										role="group"
										onClick={wingSlap}
										onMouseOver={previewWingSlap}
										onMouseOut={unPreview}
									>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "rgba(76,119,81,0.7) transparent transparent transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-30%"
											opacity="0"
											transition="opacity 0.3s"
											h="170px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>Wing Slap (2 energy)</strong>
												<br />
												Slap the enemy with your wing dealing close range damage. Deals{" "}
												{turnRef.current === 1
													? (4 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti
													: (4 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti}{" "}
												damage
											</Text>
										</Box>
										Wing Slap (2)
									</Button>
									<Button
										bgColor="rgba(76,119,81,0.7)"
										cursor="pointer"
										color={"white"}
										h="40px"
										w="130px"
										role="group"
										onClick={lifeDrain}
										onMouseOver={previewKnightSlash}
										onMouseOut={unPreview}
									>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "rgba(76,119,81,0.7) transparent transparent transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-30%"
											opacity="0"
											transition="opacity 0.3s"
											h="170px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>Life Drain (1 energy)</strong>
												<br />
												Bite a close range enemy stealing{" "}
												{turnRef.current === 1
													? 1 * playerTwoRef.current.incomingDamageMulti
													: 1 * playerOneRef.current.incomingDamageMulti}{" "}
												health. This move is unaffected by weakness.
											</Text>
										</Box>
										Life Drain (1)
									</Button>
									<Button bgColor="rgba(76,119,81,0.7)" cursor="pointer" color={"white"} h="40px" w="140px" role="group" onClick={eyeShoot}>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "rgba(76,119,81,0.7) transparent transparent transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-30%"
											opacity="0"
											transition="opacity 0.3s"
											h="170px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>Laser Shot (1 energy)</strong>
												<br />
												Shoot a laser ball at the enemy wherever they are on the grid. Deals{" "}
												{turnRef.current === 1
													? (1 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti
													: (1 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti}{" "}
												damage
											</Text>
										</Box>
										Laser Shot (1)
									</Button>
									<Button
										bgColor="rgba(76,119,81,0.7)"
										cursor="pointer"
										color={"white"}
										h="40px"
										w="140px"
										role="group"
										onClick={bigEyeShoot}
									>
										<Box
											_groupHover={{
												visibility: "visible",
												opacity: "1",
											}}
											_after={{
												content: '""',
												position: "absolute",
												top: "100%",
												left: "50%",
												marginLeft: "-5px",
												border: "5px solid",
												borderColor: "rgba(76,119,81,0.7) transparent transparent transparent",
											}}
											visibility="hidden"
											w="200px"
											bgColor="rgba(76,119,81,0.85)"
											color="white"
											borderRadius="6px"
											padding="5px 0"
											position="absolute"
											zIndex="100"
											bottom="120%"
											left="0"
											marginLeft="-30%"
											opacity="0"
											transition="opacity 0.3s"
											h="170px"
										>
											<Text boxSizing="border-box" p="5px" w="200px" whiteSpace={"normal"}>
												<strong>Power Shot (7 energy)</strong>
												<br />
												Shoot a ultra high energy laser ball at the enemy wherever they are on the grid. Deals{" "}
												{turnRef.current === 1
													? (9 - playerOneRef.current.weakness) * playerTwoRef.current.incomingDamageMulti
													: (9 - playerTwoRef.current.weakness) * playerOneRef.current.incomingDamageMulti}{" "}
												damage and applies 1 weakness to their attacks next turn.
											</Text>
										</Box>
										Power Shot (7)
									</Button>
								</>
							) : null}
							<Button
								cursor={"pointer"}
								h="40px"
								w="100px"
								bgColor={
									(turnRef.current === 1 && playerOneRef.current.energy < 1) || (turnRef.current === 2 && playerTwoRef.current.energy < 1)
										? "red"
										: "#4974a5"
								}
								onClick={endTurn}
								fontWeight="600"
								fontSize={"1em"}
								color={
									(turnRef.current === 1 && playerOneRef.current.energy < 1) || (turnRef.current === 2 && playerTwoRef.current.energy < 1)
										? "black"
										: "white"
								}
							>
								End Turn
							</Button>
						</Flex>
					</>
				) : null}
			</Flex>
			{blocked ? <Blocker /> : null}
			{winner ? <Winscreen /> : null}
		</>
	)
}
