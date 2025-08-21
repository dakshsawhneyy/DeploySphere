import { useState } from "react"
import { useNavigate } from "react-router"
import axios from "axios"

const Home = () => {

    const [name, setName] = useState("")
    const [gitHub, setGitHub] = useState("")

    const navigate = useNavigate();

    const handleClick = async() => {
        if (!gitHub) {
            alert("Please enter a GitHub username");
            return;
        }
        try {
            const response = await axios.post(`http://localhost:9000/project`, { name: name, gitURL: gitHub });
            console.log(response.data)
            if (response.data.status == 'success') {
                alert("Project created successfully");
                navigate(`/project/${response.data.data.id}`);
            } else {
                alert("Failed to create project");
            }
        } catch (error) {   
            console.error("Error submitting GitHub username:", error);
        }
    }

  return (
    <div className="h-screen md:p-6 items-center">
        <h1 className="text-4xl text-center ">Welcome to DeploySphere</h1>
        <div className="flex flex-col mt-72 gap-6">
            <h2 className="text-xl text-center">Enter your Name and GitHub Repo Link</h2>
            <input type="text" className="ml-auto mr-auto w-80 md:w-96 px-3 border rounded py-2" id="name" placeholder="Enter your name" onChange={(e) => setName(e.target.value)} />
            <input type="text" className="ml-auto mr-auto w-80 md:w-96 px-3 border rounded py-2" id="github" placeholder="Enter github repo" onChange={(e) => setGitHub(e.target.value)} />
            <button onClick={handleClick} className="bg-black text-white ml-auto mr-auto rounded w-24 px-4 py-2">Submit</button>
        </div>
    </div>
  )
}

export default Home
