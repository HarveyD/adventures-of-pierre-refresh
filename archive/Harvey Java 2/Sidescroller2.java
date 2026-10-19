import java.awt.*;
import java.awt.event.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import javax.swing.*;

public class Sidescroller2 {
	BufferedReader in = new BufferedReader(new InputStreamReader(System.in));

	JFrame f;

	Image corgi;

	ImagePanel pic;

	int corgiposition = 500;

	Image PlayerCharacter;

	String pictureName;

	boolean corgiforward = true;

	int[][] BoxLocations = new int[10][4];

	int PlayerCharacterX = 500, PlayerCharacterY = 550,
			PlayermomemtumXleft = 1, PlayermomemtumXright = 1,
			PlayermomemtumY = 1, numberOfPlatforms = 0;

	boolean left = false, right = false, jump = false, inair = false,
			jumpRelease = true, movementallowedX = true,
			movementallowedY = true, onleftwall = false, onrightwall = false;

	class ImagePanel extends JPanel {
		Image backgroundImage;

		public ImagePanel(Image img) {
			backgroundImage = img;
		}

		public void paintComponent(Graphics g) {

			super.paintComponent(g);
			g.drawImage(backgroundImage, -PlayerCharacterX / 4,
					-PlayerCharacterY / 4, this);

			g.drawImage(corgi, corgiposition - PlayerCharacterX,
					950 - PlayerCharacterY, this);

			g.drawImage(PlayerCharacter, 600, 400, this);

			g.drawRect(600, 400, 65, 100);

			for (int x = 0; x < numberOfPlatforms; x++) {
				g.fillRect((BoxLocations[x][0] - PlayerCharacterX + 100),
						(BoxLocations[x][1] - PlayerCharacterY + 400),
						BoxLocations[x][2], BoxLocations[x][3]);
			}
		}
	}

	public static void main(String[] args) {
		Sidescroller2 ss = new Sidescroller2();
		ss.launch();
	}

	public void readInfo() {
		try {
			String line;
			String[] words = new String[10];
			BufferedReader in = new BufferedReader(new FileReader(new File(
					"Levels.txt")));
			pictureName = in.readLine();
			numberOfPlatforms = Integer.parseInt(in.readLine());
			for (int x = 0; x < numberOfPlatforms; x++) {
				line = in.readLine();
				words = line.split(",");
				BoxLocations[x][0] = Integer.parseInt(words[0]);
				BoxLocations[x][1] = Integer.parseInt(words[1]);
				BoxLocations[x][2] = Integer.parseInt(words[2]);
				BoxLocations[x][3] = Integer.parseInt(words[3]);
			}
			in.close();
		} catch (NumberFormatException nfe) {
		} catch (IOException ioe) {
		}
	}

	public void launch() {
		f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		f.addKeyListener(new MoveListener());
		f.setSize(1280, 720);
		f.setResizable(false);
		f.getContentPane().add(pic, BorderLayout.CENTER);
		f.setVisible(true);
		PlayerCharacter = Toolkit.getDefaultToolkit().getImage(
				"player_character.png");
		corgi = Toolkit.getDefaultToolkit().getImage("corgi enemy.jpg");
		Movement go = new Movement();
		go.start();
		Gravity go2 = new Gravity();
		go2.start();
		CollisionY go3 = new CollisionY();
		go3.start();
		CollisionX go4 = new CollisionX();
		go4.start();
		Enemiesandplatforms go5 = new Enemiesandplatforms();
		go5.start();
	}

	public Sidescroller2() {
		readInfo();
		f = new JFrame("The Adventures of Pierre");
		f.setFont(new Font("Modern", Font.BOLD, 20));
		pic = new ImagePanel(Toolkit.getDefaultToolkit().getImage(pictureName));
	}

	public class CollisionY extends Thread {
		public void run() {
			do {
				int allwrong = 0;
				for (int x = 0; x < numberOfPlatforms; x++) {
					if (PlayerCharacterY > (BoxLocations[x][1] - 100)
							&& PlayerCharacterY < (BoxLocations[x][1] - 60)
							&& PlayerCharacterX > ((BoxLocations[x][0] - 60) - 500)
							&& PlayerCharacterX < ((BoxLocations[x][0] + BoxLocations[x][2]) - 500)
							&& PlayermomemtumY > 0) {
						PlayerCharacterY = BoxLocations[x][1] - 99;
						movementallowedY = false;
						// this makes trampoline effect

						inair = false;
						break;

					} else {
						allwrong++;
					}
				}

				for (int x = 0; x < numberOfPlatforms; x++) {
					if (PlayerCharacterY > (BoxLocations[x][1]
							+ BoxLocations[x][3] - 100)
							&& PlayerCharacterY < (BoxLocations[x][1]
									+ BoxLocations[x][3] + 10)
							&& PlayerCharacterX > ((BoxLocations[x][0] - 60) - 500)
							&& PlayerCharacterX < ((BoxLocations[x][0] + BoxLocations[x][2]) - 500)
							&& PlayermomemtumY < 0) {
						PlayerCharacterY = BoxLocations[x][1]
								+ BoxLocations[x][3];
						// this makes trampoline effect
						PlayermomemtumY = 0;
						break;
					}
				}


				if (allwrong == numberOfPlatforms) {
					movementallowedY = true;
					inair = true;
				} else {
					movementallowedY = false;
				}

				try {
					this.sleep(10);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class CollisionX extends Thread {
		public void run() {
			do {
				for (int x = 0; x < numberOfPlatforms; x++) {
					if (PlayerCharacterY > (BoxLocations[x][1] - 90)
							&& PlayerCharacterY < (BoxLocations[x][1] + BoxLocations[x][3])
							&& PlayerCharacterX > ((BoxLocations[x][0]
									+ BoxLocations[x][2] - 75) - 500)
							&& PlayerCharacterX < ((BoxLocations[x][0]
									+ BoxLocations[x][2] + 10) - 500)
							&& PlayermomemtumXleft > 0) {
						PlayerCharacterX = BoxLocations[x][0]
								+ BoxLocations[x][2] - 500;
						// this makes trampoline effect
						PlayermomemtumXleft = 0;
						onleftwall = true;
						if (PlayermomemtumY > 0) {
							PlayermomemtumY = 0;
						}
						movementallowedX = false;
						break;
					} else {
						movementallowedX = true;
						onleftwall = false;
					}
				}

				for (int x = 0; x < numberOfPlatforms; x++) {
					if (PlayerCharacterY > (BoxLocations[x][1] - 90)
							&& PlayerCharacterY < (BoxLocations[x][1] + BoxLocations[x][3])
							&& PlayerCharacterX > ((BoxLocations[x][0] - 75) - 500)
							&& PlayerCharacterX < ((BoxLocations[x][0] - 55) - 500)
							&& PlayermomemtumXright > 0) {
						PlayerCharacterX = BoxLocations[x][0] - 566;
						// this makes trampoline effect
						PlayermomemtumXright = 0;
						onrightwall = true;
						if (PlayermomemtumY > 0) {
							PlayermomemtumY = 0;
						}
						movementallowedX = false;
						break;
					} else {
						movementallowedX = true;
						onrightwall = false;
					}
				}

				try {
					this.sleep(10);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class Enemiesandplatforms extends Thread {
		public void run() {
			do {

				if (corgiposition > 2200) {
					corgiforward = false;
				}
				if (corgiposition < 0) {
					corgiforward = true;
				}

				if (corgiforward) {
					corgiposition = corgiposition + 1;
				} else {
					corgiposition = corgiposition - 1;
				}

				try {
					this.sleep(1);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class Gravity extends Thread {
		public void run() {
			do {
				if (jump) {
					// this value controls height of jump
					PlayermomemtumY = -20;
					jump = false;
				}

				if (movementallowedY) {
					if (PlayermomemtumY < 20) {
						PlayermomemtumY++;
					}
					PlayerCharacterY = PlayerCharacterY + PlayermomemtumY;
				}
				pic.repaint();
				try {
					this.sleep(13);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	public class Movement extends Thread {
		public void run() {
			do {
				// character movement for left
				if (left) {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								- PlayermomemtumXleft;
					}
					if (PlayermomemtumXleft < 20) {
						PlayermomemtumXleft++;
					}
				} else {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								- PlayermomemtumXleft;
					}
					if (PlayermomemtumXleft >= 0) {
						PlayermomemtumXleft--;
					}
				}
				// character movement for right
				if (right) {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								+ PlayermomemtumXright;
					}
					if (PlayermomemtumXright < 20) {
						PlayermomemtumXright++;
					}
				} else {
					if (movementallowedX) {
						PlayerCharacterX = PlayerCharacterX
								+ PlayermomemtumXright;
					}
					if (PlayermomemtumXright >= 0) {
						PlayermomemtumXright--;
					}
				}
				pic.repaint();
				try {
					this.sleep(20);
				} catch (InterruptedException e) {
				}
			} while (true);
		}
	}

	// button listener
	public class MoveListener implements KeyListener {
		public void keyReleased(KeyEvent e) {
			if (e.getKeyCode() == KeyEvent.VK_LEFT) {
				left = false;
			}
			if (e.getKeyCode() == KeyEvent.VK_RIGHT) {
				right = false;
			}
			if (e.getKeyCode() == KeyEvent.VK_SPACE) {
				jumpRelease = true;
			}
		}

		public void keyPressed(KeyEvent e) {
			if (e.getKeyCode() == KeyEvent.VK_LEFT&&right==false) {
				left = true;
			}
			if (e.getKeyCode() == KeyEvent.VK_RIGHT&&left==false) {
				right = true;

			}
			if (e.getKeyCode() == KeyEvent.VK_SPACE) {
				if (jumpRelease) {
					if (!inair) {
						inair = true;
						jump = true;
					}
					if (onleftwall) {
						PlayermomemtumXleft = -20;
						PlayermomemtumY = -20;
					}
					if (onrightwall) {
						PlayermomemtumXright = -20;
						PlayermomemtumY = -20;
					}
				}
			}
		}

		public void keyTyped(KeyEvent e) {
		}
	}
}