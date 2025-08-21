import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router';

const Projects = () => {

    // Fetch project details from its id from params
    const { id } = useParams();

    const [project, setProject] = useState(null)
    const [deployment, setDeployment] = useState(null);

    const navigate = useNavigate()

    // Fetch project details from the API
    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:9000/project/${id}`);
                if (response.data.status === 'success') {
                    setProject(response.data.data);
                } else {
                    console.error("Failed to fetch project details");
                    alert("Failed to fetch project details");
                }
            } catch (error) {
                console.error("Error fetching project details:", error);
            }
        }
        fetchProjectDetails();
    }, [id])

    const handleDeploy = async(req,res) => {
        try {
            const response = await axios.post(`http://localhost:9000/deploy`,{
                projectId: id
            });

            if(response.status === 'success') {
                alert("Project deployed successfully");
            }else {
                alert("Failed to deploy project");
                return;
            }

            const project = response.data.project
            setProject(project);

            const deployment = response.data.project
            setDeployment(deployment);

            console.log("Deployment response:", response.data);
        } catch (error) {
            console.error("Error deploying project:", error);
        }
    }

   return (
    <div className=''>
        <h1 className='text-3xl text-center'>Project Details</h1>
        {project ? 
            <div className='mt-10 text-center'>
                <h2 className='text-2xl'>User Name: {project.name}</h2>
                <h3 className='text-xl'>GitHub URL: <a href ={project.gitURL} target="_blank" rel="noopener noreferrer" className='text-blue-500'>{project.gitURL}</a></h3>
                <h3 className='text-xl'>Project SubDomain: {project.subDomain}</h3>
                <h3 className='text-xl'>Project Status: {project.status}</h3>
            </div>
            : null
        }
        <button className='bg-black text-white p-3 rounded ml-auto mr-auto' onClick={handleDeploy}>Deploy</button>
    </div>
  )
}

export default Projects
