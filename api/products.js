const TOKEN = "BumSieuDepTraiHaHa"; // đổi thành token khó hơn nhé
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal Access Token (repo scope)
const REPO = "minh597/pleaseapi"; // ví dụ: hoangdev/null-shop
const PATH = "data/products.json";

const { Octokit } = require("@octokit/rest");

export default async function handler(req, res) {
  // Check token
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "Token sai hoặc thiếu rồi bé ơi" });
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    // Lấy file hiện tại để lấy SHA (bắt buộc khi update)
    const { data } = await octokit.repos.getContent({
      owner: REPO.split("/")[0],
      repo: REPO.split("/")[1],
      path: PATH,
    });

    let products = [];
    if (data.content) {
      products = JSON.parse(Buffer.from(data.content, "base64").toString());
    }

    // GET tất cả
    if (req.method === "GET") {
      return res.status(200).json(products);
    }

    // POST thêm sản phẩm mới
    if (req.method === "POST") {
      const { name, quantity, des, price, img } = req.body;

      if (!name || !price || !img) {
        return res.status(400).json({ error: "Thiếu name, price hoặc img" });
      }

      const newProduct = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
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

    // PUT cập nhật (theo id)
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

    // DELETE
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

      return res.status(200).json({ message: "Xóa thành công", deleted });
    }

    res.status(405).json({ error: "Method không được hỗ trợ" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server rồi bé ơi", details: error.message });
  }
}
