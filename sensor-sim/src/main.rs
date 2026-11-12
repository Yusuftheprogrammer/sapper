use rand::Rng;
use rand::seq::SliceRandom;
use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS};
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const ZONES: u32 = 10;

struct Sensor {
    id: u32,
    zone: u32,
    baseline: f64,
    offset: f64,
    temp: f64,
    alive: bool,
}

fn new_sensor(id: u32, rng: &mut impl Rng) -> Sensor {
    let zone = id % ZONES;
    let baseline = 22.0 + zone as f64 * 0.5 + rng.gen_range(-1.0..1.0);
    Sensor {
        id,
        zone,
        baseline,
        offset: 0.0,
        temp: baseline,
        alive: true,
    }
}

#[derive(Serialize)]
struct Reading {
    temp: f64,
    zone: u32,
    ts: u64,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "cmd", rename_all = "lowercase")]
enum Command {
    Heatwave { zone: u32, delta: f64 },
    Kill { count: usize },
    Revive,
    Scale { count: u32 },
    Reset,
}


fn apply(cmd: Command, sensors: &mut Vec<Sensor>, rng: &mut impl Rng) {
    match cmd {
        Command::Heatwave { zone, delta } => {
            for s in sensors.iter_mut().filter(|s| s.zone == zone) {
                s.offset = delta;
            }
        }
        Command::Kill { count } => {
            // pick random living sensors and silence them
            let mut alive: Vec<usize> = (0..sensors.len()).filter(|&i| sensors[i].alive).collect();
            alive.shuffle(rng);
            for i in alive.into_iter().take(count) {
                sensors[i].alive = false;
            }
        }
        Command::Revive => {
            for s in sensors.iter_mut() {
                s.alive = true;
            }
        }
        Command::Scale { count } => {
            sensors.truncate(count as usize);
            while (sensors.len() as u32) < count {
                let id = sensors.len() as u32;
                sensors.push(new_sensor(id, rng));
            }
        }
        Command::Reset => {
            for s in sensors.iter_mut() {
                s.alive = true;
                s.offset = 0.0;
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let count: u32 = std::env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(1000);
    let host = std::env::var("MQTT_HOST").unwrap_or("localhost".into());

    let mut opts = MqttOptions::new("sensor-simulator", host, 1883);
    opts.set_keep_alive(Duration::from_secs(5));
    let (client, mut eventloop) = AsyncClient::new(opts, 20_000);

    // A channel: the network task sends commands, the main loop receives them
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Command>();

    let sub_client = client.clone();
    tokio::spawn(async move {
        loop {
            match eventloop.poll().await {
                // (re)subscribe every time we connect
                Ok(Event::Incoming(Packet::ConnAck(_))) => {
                    sub_client
                        .subscribe("control/command", QoS::AtLeastOnce)
                        .await
                        .unwrap();
                    println!("connected, listening on control/command");
                }
                Ok(Event::Incoming(Packet::Publish(p))) => {
                    match serde_json::from_slice::<Command>(&p.payload) {
                        Ok(cmd) => {
                            println!("command: {cmd:?}");
                            let _ = tx.send(cmd);
                        }
                        Err(e) => eprintln!("bad command: {e}"),
                    }
                }
                Ok(_) => {}
                Err(e) => {
                    eprintln!("MQTT error: {e}");
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        }
    });

    let mut rng = rand::thread_rng();
    let mut sensors: Vec<Sensor> = (0..count).map(|id| new_sensor(id, &mut rng)).collect();
    println!("Simulating {count} sensors, publishing every second...");

    let mut ticker = tokio::time::interval(Duration::from_secs(1));
    loop {
        ticker.tick().await;

        // handle any commands that arrived since the last tick
        while let Ok(cmd) = rx.try_recv() {
            apply(cmd, &mut sensors, &mut rng);
            let alive = sensors.iter().filter(|s| s.alive).count();
            println!("now {} sensors, {} alive", sensors.len(), alive);
        }

        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        for s in sensors.iter_mut() {
            if !s.alive {
                continue; // dead sensor: publish nothing
            }
            let target = s.baseline + s.offset;
            let noise = rng.gen_range(-0.3..0.3);
            s.temp += (target - s.temp) * 0.1 + noise;

            let reading = Reading {
                temp: (s.temp * 100.0).round() / 100.0,
                zone: s.zone,
                ts,
            };
            let payload = serde_json::to_string(&reading).unwrap();
            let topic = format!("sensors/{}/temp", s.id);
            client
                .publish(topic, QoS::AtMostOnce, false, payload)
                .await
                .unwrap();
        }
    }
}
