// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ureq::Error;
use std::fs;
use std::path::Path;


const MOONCAKE_HOST:&str = "https://mooncake-v2.shizhuang-inc.com";

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_api_by_project_id(project_id:&str,cookie:&str)->Result<String,()>{
    let get_api_by_project_id_path = ["/mooncake/category/interfaceTree?projectId=",project_id].concat();
    let response = match ureq::get(&[MOONCAKE_HOST,&get_api_by_project_id_path].concat())
    .set("cookie", cookie)
    .call(){
        Ok(res)=>res,
        Err(Error::Status(_,_))=>panic!("1 staus"),
        Err(Error::Transport(_))=>panic!("1 transport")
    };
    let response = match response.into_string() {
        Ok(res)=>res,
        Err(_)=>panic!("io error"),
    };
    // println!("{response:#?}");
    Ok(response)
}

#[tauri::command]
fn get_api_info_by_api_id(id:&str,cookie:&str)->Result<String,()>{
    let get_api_info_by_api_id_path = ["/mooncake/yapi/detail?id=",id].concat();
    let response = match ureq::get(&[MOONCAKE_HOST,&get_api_info_by_api_id_path].concat())
    .set("cookie", cookie)
    .call(){
        Ok(res)=>res,
        Err(Error::Status(_,_))=>panic!("1 staus"),
        Err(Error::Transport(_))=>panic!("1 transport")
    };
    let response = match response.into_string() {
        Ok(res)=>res,
        Err(_)=>panic!("io error"),
    };
    println!("{response:#?}");
    Ok(response)
}

#[tauri::command]
fn get_api_type_by_body(lang:&str,query_schema:&str,name:&str,req_schema:&str,res_schema:&str,cookie:&str)->Result<String, ()>{
    let get_api_type_by_body_path = "/mooncake/yapi/schema";
    let response = match ureq::post(&[MOONCAKE_HOST,&get_api_type_by_body_path].concat())
    .set("cookie", cookie)
    .send_json(ureq::json!({
        "lang":lang,
    "querySchema":query_schema,
    "name":name,
    "reqSchema":req_schema,
    "resSchema":res_schema
    })){
        Ok(res)=>res,
        Err(Error::Status(_,_))=>panic!("1 staus"),
        Err(Error::Transport(_))=>panic!("1 transport")
    };
    let response = match response.into_string() {
        Ok(res)=>res,
        Err(_)=>panic!("io error"),
    };
    println!("{response:#?}");
    Ok(response)
}

#[tauri::command]
fn write_api_type_into_directory(path:&str,req_schema:Vec<&str>,res_schema:Vec<&str>,req_file_name:&str,res_file_name:&str)->Result<bool, ()>{
    if req_schema.len() > 0{
        match fs::write([path,req_file_name].concat(), req_schema.join("\n")){
            Ok(_)=>{},
            Err(_)=>{}
        };
    }
    if res_schema.len() > 0 {
        match fs::write([path,res_file_name].concat(), res_schema.join("\n")){
            Ok(_)=>{},
            Err(_)=>{}
        };
    } 
    Ok(true)
}

#[tauri::command]
fn create_nest_project_api_directory(path:&str,dir_path:Vec<Vec<&str>>)->Result<bool,()>{
    let absolute_dir_path = dir_path.iter().map(|item| item.iter().map(|i| format!("{}/{}",path,i)).collect::<Vec<String>>()).collect::<Vec<_>>();
    let absolute_dir_path = absolute_dir_path.iter().flatten().collect::<Vec<_>>();
    for dir_path in absolute_dir_path {
        match fs::create_dir_all(dir_path) {
            Ok(_)=>{},
            Err(_)=>panic!("create dir error")
        }
    }
    Ok(true)
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet,get_api_by_project_id,get_api_info_by_api_id,get_api_type_by_body,write_api_type_into_directory,create_nest_project_api_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
