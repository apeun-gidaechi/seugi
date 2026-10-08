import React, { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { paths } from "@/Constants/paths";

const SelectSchool = React.lazy(() => import("@/Pages/Workspace/Selectschool/SelectSchoolPage"));
const SchoolCode = React.lazy(() => import("@/Pages/Workspace/Schoolcode/SchoolCodePage"));
const JoinSuccess = React.lazy(() => import("@/Pages/Workspace/JoinSuccess/JoinSuccessPage"));
const Login = React.lazy(() => import("@/Pages/OnBording/Login/LoginPage"));
const Selectingjob = React.lazy(() => import("@/Pages/Workspace/Selectjob/SelectJobPage"));
const Emailsignup = React.lazy(() => import("@/Pages/OnBording/EmailSignUp/EmailSignUpPage"));
const CreateSchool = React.lazy(() => import("@/Pages/Workspace/CreateSchool/CreateSchoolPage"));
const Authentication = React.lazy(
  () => import("@/Pages/OnBording/EmailAuthentication/EmailAuthenticationPage"),
);
const WaitingJoin = React.lazy(() => import("@/Pages/Workspace/WaitingJoin/WaitingJoinPage"));
const Home = React.lazy(() => import("@/Pages/Home/home"));
const Chat = React.lazy(() => import("@/Pages/chat/chat"));
const Groupchat = React.lazy(() => import("@/Pages/GroupChat/index"));
const Shell = React.lazy(() => import("./Shell/Shell"));
const AdminGeneral = React.lazy(() => import("@/Pages/Admin/General/AdminGeneral"));
const AdminAlarm = React.lazy(() => import("@/Pages/Admin/Alarm/AdminAlarm"));
const ManageMember = React.lazy(() => import("@/Pages/Admin/ManageMember/ManageMember"));
const InviteMember = React.lazy(() => import("@/Pages/Admin/InviteMember/InviteMember"));

const Router = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path={paths.login} element={<Login />} />
          <Route path={paths.signup} element={<Emailsignup />} />
          <Route path={paths.auth} element={<Authentication />} />
          <Route path={paths.selectjob} element={<Selectingjob />} />
          <Route path={paths.schoolcode} element={<SchoolCode />} />
          <Route path={paths.joinsuccess} element={<JoinSuccess />} />
          <Route path={paths.selectschool} element={<SelectSchool />} />
          <Route path={paths.createschool} element={<CreateSchool />} />
          <Route path={paths.waitingjoin} element={<WaitingJoin />} />
          <Route path={paths.admingeneral} element={<AdminGeneral />} />
          <Route path={paths.adminalarm} element={<AdminAlarm />} />
          <Route path={paths.managemember} element={<ManageMember />} />
          <Route path={paths.invitemember} element={<InviteMember />} />
          <Route path="/" element={<Shell />}>
            <Route path={paths.home} element={<Home />} />
            <Route path={paths.chat} element={<Chat />} />
            <Route path={paths.groupchat} element={<Groupchat />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default Router;
