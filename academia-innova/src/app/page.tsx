"use client"
import Image from "next/image";
import { useRouter } from 'next/navigation';


const Home = () => {
  const router = useRouter();
  router.push('/login');
}

export default Home;
