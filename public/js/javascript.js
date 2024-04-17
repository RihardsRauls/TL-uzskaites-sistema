var masinasID = document.getElementById("car_id");

function izveidoID() {

  let IDskaitlis;

  do {
    const cipars = Math.random();
    IDskaitlis = Math.floor(cipars * 10000000000);
  } while (IDskaitlis.toString().length !== 10);

  return IDskaitlis;
}

function izveidojaunuId() {
    document.getElementById("informacija").reset();
    var jaunaisId = izveidoID();
    masinasID.value = jaunaisId;
}

masinasID.value = izveidoID();