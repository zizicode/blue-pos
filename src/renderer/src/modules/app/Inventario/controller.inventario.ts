export const Inventario = {
    create: async (data: [] | any) => {
        if (data.length > 1) console.log("Creando:", data.length, "Almacenes");
        if (data.length < 2) console.log("Creando:", data.length, "Almacene");

        // const payload = Object.fromEntries(data.map(item => [item.key, item.value]));
        // const result = await window.api.call('almacenes', 'create', { ...payload, usuario_id: 1 });
        // return result
        console.log(data)
    },
};