const TOKEN = "BumSieuDepTraiHaHa"; // đổi token riêng
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "minh597/pleaseapi";
const PATH = "data/products.json";

import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  // --- CHECK TOKEN ---
  const urlToken = req.query.token;

  if (!urlToken || urlToken !== TOKEN) {
    return res.status(401).json({ error: "Sai token rồi bé ơi", token_received: urlToken });
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    // Lấy file hiện tại
    const { data } = await octokit.repos.getContent({
      owner: REPO.split("/")[0],
      repo: REPO.split("/")[1],
      path: PATH,
    });

    let products = [];
    if (data.content) {
      products = JSON.parse(Buffer.from(data.content, "base64").toString());
    }

    // --- GET ---
    if (req.method === "GET") {
      return res.status(200).json(products);
    }

    // --- POST ---
    if (req.method === "POST") {
      const { name, quantity, des, price, img } = req.body;

      if (!name || !price || !img) {
        return res.status(400).json({ error: "Thiếu name, price hoặc img" });
      }

      const newProduct = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        name,
        quantity: Number(quantity) || 0,
        des: des || "",
        price: Number(price),
        img,
      };

      products.push(newProduct);

      await octokit.repos.createOrUpdateFileContents({
        owner: REPO.split("/")[0],
        repo: REPO.split("/")[1],
        path: PATH,
        message: `Add product: ${name}`,
        content: Buffer.from(JSON.stringify(products, null, 2)).toString("base64"),
        sha: data.sha,
        branch: "main",
      });

      return res.status(201).json(newProduct);
    }

    // --- PUT ---
    if (req.method === "PUT") {
      const { id, name, quantity, des, price, img } = req.body;

      const index = products.findIndex((p) => p.id === id);
      if (index === -1) return res.status(404).json({ error: "Không tìm thấy sản phẩm" });

      products[index] = {
        ...products[index],
        name: name || products[index].name,
        quantity: quantity !== undefined ? Number(quantity) : products[index].quantity,
        des: des || products[index].des,
        price: price !== undefined ? Number(price) : products[index].price,
        img: img || products[index].img,
      };

      await octokit.repos.createOrUpdateFileContents({
        owner: REPO.split("/")[0],
        repo: REPO.split("/")[1],
        path: PATH,
        message: `Update product: ${products[index].name}`,
        content: Buffer.from(JSON.stringify(products, null, 2)).toString("base64"),
        sha: data.sha,
        branch: "main",
      });

      return res.status(200).json(products[index]);
    }

    // --- DELETE ---
    if (req.method === "DELETE") {
      const { id } = req.query;

      const index = products.findIndex((p) => p.id === id);
      if (index === -1) return res.status(404).json({ error: "Không tìm thấy" });

      const deleted = products.splice(index, 1)[0];

      await octokit.repos.createOrUpdateFileContents({
        owner: REPO.split("/")[0],
        repo: REPO.split("/")[1],
        path: PATH,
        message: `Delete product: ${deleted.name}`,
        content: Buffer.from(JSON.stringify(products, null, 2)).toString("base64"),
        sha: data.sha,
        branch: "main",
      });

      return res.status(200).json({ message: "Xoá thành công", deleted });
    }

    res.status(405).json({ error: "Method không hỗ trợ" });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Lỗi server", details: e.message });
  }
}
